import { ToolCall } from 'ai';
import { getHtmlContext } from './getHtmlContext';
import { focusTo, getCurrentForm, getElementBySelector, sleep } from './utils';

interface ReactHTMLInputElement extends HTMLInputElement {
  _valueTracker?: {
    getValue: () => string;
    setValue: (value: ReactHTMLInputElement) => void;
  };
}

export type ActionInputTool = ToolCall<'actionInput', { selector?: string; value?: string }>;

export async function actionInput(params: { selector?: string; value?: string; container: HTMLElement }) {
  console.log('🚀 [zph] ~ actionInput:', params.selector, params.value, params.container);

  const { selector, value, container } = params;

  if (!selector) {
    return 'no input element';
  }

  if (!value) {
    return 'no input value';
  }

  const element = getElementBySelector<ReactHTMLInputElement>(selector, container);

  if (!element) {
    return 'no element';
  }

  await focusTo(element);

  element.value = value;
  const event = new Event('input', { bubbles: true });
  (event as unknown as { simulated: boolean }).simulated = true;
  const tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(element);
  }
  element.dispatchEvent(event);

  console.log('Input event dispatched for element:', element, value);

  await sleep(50);

  const currentHtml = await getHtmlContext(container);

  return `input done and the latest html is:\n${currentHtml}`;
}
