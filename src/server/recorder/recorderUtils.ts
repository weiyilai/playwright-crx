/**
 * Copyright (c) Rui Figueira.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type * as recorderActions from '@recorder/actions';
import type * as channels from '@protocol/channels';
import { toKeyboardModifiers } from 'playwright-core/lib/server/codegen/language';
import { buildFullSelector } from 'playwright-core/lib/server/recorder/recorderUtils';

const kDefaultTimeout = 5_000;

export function traceParamsForAction(actionInContext: recorderActions.ActionInContext): { method: string, apiName: string, params: any } {
  const { action } = actionInContext;
  switch (action.name) {
    case 'navigate': {
      const params: channels.FrameGotoParams = {
        url: action.url,
      };
      return { method: 'goto', apiName: 'page.goto', params };
    }
    case 'openPage': {
      return { method: 'newPage', params: {}, apiName: 'browserContext.newPage' };
    }
    case 'closePage': {
      return { method: 'close', params: {}, apiName: 'page.close' };
    }
  }
  const selector = buildFullSelector(actionInContext.frame.framePath, action.selector);
  switch (action.name) {

    case 'click': {
      const params: channels.FrameClickParams = {
        selector,
        strict: true,
        modifiers: toKeyboardModifiers(action.modifiers),
        button: action.button,
        clickCount: action.clickCount,
        position: action.position,
      };
      return { method: 'click', apiName: 'locator.click', params };
    }
    case 'press': {
      const params: channels.FramePressParams = {
        selector,
        strict: true,
        key: [...toKeyboardModifiers(action.modifiers), action.key].join('+'),
      };
      return { method: 'press', apiName: 'locator.press', params };
    }
    case 'fill': {
      const params: channels.FrameFillParams = {
        selector,
        strict: true,
        value: action.text,
      };
      return { method: 'fill', apiName: 'locator.fill', params };
    }
    case 'setInputFiles': {
      const params: channels.FrameSetInputFilesParams = {
        selector,
        strict: true,
        localPaths: action.files,
      };
      return { method: 'setInputFiles', apiName: 'locator.setInputFiles', params };
    }
    case 'check': {
      const params: channels.FrameCheckParams = {
        selector,
        strict: true,
      };
      return { method: 'check', apiName: 'locator.check', params };
    }
    case 'uncheck': {
      const params: channels.FrameUncheckParams = {
        selector,
        strict: true,
      };
      return { method: 'uncheck', apiName: 'locator.uncheck', params };
    }
    case 'select': {
      const params: channels.FrameSelectOptionParams = {
        selector,
        strict: true,
        options: action.options.map(option => ({ value: option })),
      };
      return { method: 'selectOption', apiName: 'locator.selectOption', params };
    }
    case 'assertChecked': {
      const params: channels.FrameExpectParams = {
        selector: action.selector,
        expression: 'to.be.checked',
        isNot: !action.checked,
        timeout: kDefaultTimeout,
      };
      return { method: 'expect', apiName: 'expect.toBeChecked', params };
    }
    case 'assertText': {
      const params: channels.FrameExpectParams = {
        selector,
        expression: 'to.have.text',
        expectedText: [],
        isNot: false,
        timeout: kDefaultTimeout,
      };
      return { method: 'expect', apiName: 'expect.toContainText', params };
    }
    case 'assertValue': {
      const params: channels.FrameExpectParams = {
        selector,
        expression: 'to.have.value',
        expectedValue: undefined,
        isNot: false,
        timeout: kDefaultTimeout,
      };
      return { method: 'expect', apiName: 'expect.toHaveValue', params };
    }
    case 'assertVisible': {
      const params: channels.FrameExpectParams = {
        selector,
        expression: 'to.be.visible',
        isNot: false,
        timeout: kDefaultTimeout,
      };
      return { method: 'expect', apiName: 'expect.toBeVisible', params };
    }
    case 'assertSnapshot': {
      const params: channels.FrameExpectParams = {
        selector,
        expression: 'to.match.aria',
        isNot: false,
        timeout: kDefaultTimeout,
      };
      return { method: 'expect', apiName: 'expect.toMatchAriaSnapshot', params };
    }
  }
}
