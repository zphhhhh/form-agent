import { ToolCall } from 'ai';

function simplifyHTML(htmlString: string) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;

  const styleTags = tempDiv.querySelectorAll('style');
  styleTags.forEach((style) => style.remove());

  const scriptTags = tempDiv.querySelectorAll('script');
  scriptTags.forEach((script) => script.remove());

  const paths = tempDiv.querySelectorAll('path');
  paths.forEach((path) => {
    const newPath = document.createElement('path');
    path.parentNode?.replaceChild(newPath, path);
  });

  const svgs = tempDiv.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const newSvg = document.createElement('svg');
    svg.parentNode?.replaceChild(newSvg, svg);
  });

  return tempDiv.innerHTML;
}

function getDOM(dom: Element) {
  dom.querySelectorAll<HTMLElement>('[aria-haspopup][aria-expanded="false"]').forEach((item) => {
    if ((item.textContent || '').trim() === '') {
      item.click();
    }
  });

  let html = simplifyHTML(dom.outerHTML);

  const selectElements = dom.querySelectorAll('[data-popupid]');

  selectElements.forEach((element) => {
    const popupId = element.getAttribute('data-popupid');
    const popup = document.getElementById(popupId || '');

    if (popup) {
      html += `\n${getDOM(popup)}`;
    }
  });

  return html;
}

export type GetHtmlContextTool = ToolCall<'getHtmlContext', {}>;

export function getHtmlContext(selector?: string | HTMLElement | null) {
  if (!selector) {
    return '';
  }

  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;

  if (!element) {
    return '';
  }

  const dom = getDOM(element as HTMLElement);

  return dom;
}
