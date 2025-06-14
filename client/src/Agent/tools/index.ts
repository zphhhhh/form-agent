import { ToolCall } from 'ai';
import { actionClick, ActionClickTool } from './actionClick';
import { actionInput, ActionInputTool } from './actionInput';
import { getHtmlContext, GetHtmlContextTool } from './getHtmlContext';
import { getCurrentForm } from './utils';

export { actionClick, actionInput, getHtmlContext };

export interface OnToolCallParams {
  toolCall: GetHtmlContextTool | ActionClickTool | ActionInputTool;
}

export async function onToolCall({ toolCall }: { toolCall: ToolCall<string, unknown> }) {
  if (toolCall.toolName === 'getHtmlContext') {
    const form = getCurrentForm();
    const result = await getHtmlContext(form);

    return result;
  }

  if (toolCall.toolName === 'actionClick') {
    const result = await actionClick(toolCall.args as { selector?: string });

    return {
      result: result,
    };
  }

  if (toolCall.toolName === 'actionInput') {
    const result = await actionInput(toolCall.args as { selector?: string; value?: string });

    return {
      result: result,
    };
  }

  return null;
}
