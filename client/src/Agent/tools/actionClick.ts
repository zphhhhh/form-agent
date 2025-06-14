import { ToolCall } from 'ai';
import { getHtmlContext } from './getHtmlContext';
import { focusTo, getCurrentForm, getElementBySelector, sleep } from './utils';

export type ActionClickTool = ToolCall<'actionClick', { selector?: string }>;

export async function actionClick(params: { selector?: string; container: HTMLElement }) {
  console.log('🚀 [zph] ~ actionClick:', params);

  const { selector, container } = params;

  if (!selector) {
    console.log('🚀 [zph] ~ actionClick ~ no selector');
    return 'no selector';
  }

  const element = getElementBySelector(selector, container);

  if (!element) {
    console.log('🚀 [zph] ~ actionClick ~ no element');
    return 'no element';
  }

  await focusTo(element);

  element.click();

  console.log('🚀 [zph] ~ actionClick ~ element:', element);

  await sleep(310);

  const currentHtml = await getHtmlContext(container);

  return `click done and the latest html is:\n${currentHtml}`;
}
