/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Worker } from '@playwright/test';
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { CrxApplication, Page } from 'playwright-crx';
import { rimrafSync } from 'rimraf';

type Server = {
  EMPTY_PAGE: string;
  PREFIX: string;
};

type CrxFixtures = {
  expect: typeof expect;
  page: Page;
  crxApp: CrxApplication;
  server: Server;
}

type Debug = {
  enable(namespaces: string): Promise<void>;
  disable(): Promise<void>;
}

type CrxTest = (fixtures: CrxFixtures) => Promise<void>;

declare const serviceWorker: ServiceWorker;

// from https://playwright.dev/docs/chrome-extensions#testing
export const test = base.extend<{
  extensionPath: string;
  context: BrowserContext;
  createUserDataDir: () => string;
  extensionServiceWorker: Worker;
  extensionId: string;
  runCrxTest: (testFn: CrxTest) => Promise<void>;
  _extensionServiceWorkerDevtools: void;
  _debug: Debug;
}>({

  extensionPath: path.join(__dirname, '..', 'test-extension', 'dist'),

  createUserDataDir: async ({}, run) => {
    const dirs: string[] = [];
    await run(() => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-crx-test-'));
      dirs.push(dir);
      return dir;
    });
    rimrafSync(dirs);
  },

  context: async ({ extensionPath, createUserDataDir }, use) => {
    const context = await chromium.launchPersistentContext(createUserDataDir(), {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionServiceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker)
      worker = await context.waitForEvent('serviceworker');

    // wait for initialization
    await worker.evaluate(() => new Promise<void>((resolve, reject) => {
      if (serviceWorker.state !== 'activated') {
        serviceWorker.addEventListener('statechange', () => {
          if (serviceWorker.state === 'activated') resolve();
        });
        serviceWorker.addEventListener('error', reject);
      } else {
        resolve();
      }
    }));

    await use(worker);
  },

  extensionId: async ({ extensionServiceWorker }, use) => {
    const extensionId = extensionServiceWorker.url().split('/')[2];
    await use(extensionId);
  },

  runCrxTest: async ({ extensionServiceWorker, baseURL }, use) => {
    use(async (fn) => {
      const server: Server = {
        PREFIX: baseURL!,
        EMPTY_PAGE: `${baseURL}/empty.html`,
      }
      await extensionServiceWorker.evaluate(`_runTest(${fn.toString()}, { server: ${JSON.stringify(server)} })`);
    });
  },

  // we don't have a way to capture service worker logs, so this trick will open
  // service worker dev tools for debugging purposes
  _extensionServiceWorkerDevtools: async ({ context, extensionId }, run) => {
    const extensionsPage = await context.newPage();
    await extensionsPage.goto(`chrome://extensions/?id=${extensionId}`);
    await extensionsPage.locator('#devMode').click();
    await extensionsPage.getByRole('link', { name: /.*service worker.*/ }).click();
    await extensionsPage.close();
    await run();
  },

  _debug: async ({ extensionServiceWorker }, run) => {
    await run({
      async enable(namespaces: string) {
        await extensionServiceWorker.evaluate((namespaces) => {
          // @ts-ignore
          const _debug = self._debug as any;
          if (!_debug) console.warn(`_debug is not available`);
          _debug?.enable(namespaces);
        }, namespaces);
      },

      async disable() {
        await extensionServiceWorker.evaluate(() => {
          // @ts-ignore
          const _debug = self._debug as any;
          if (!_debug) console.warn(`_debug is not available`);
          _debug?.disable();
        });
      }
    });
  },
});
export const expect = test.expect;
