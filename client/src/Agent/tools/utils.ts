
export function getElementBySelector<T extends Element = HTMLElement>(selector: string, container: HTMLElement) {
  const modifiedSelector = selector.replace(/#([\w-]+)/g, '[id="$1"]');

  const globalSelectors = document.querySelectorAll<T>(modifiedSelector);
  const containSelector = container.querySelector<T>(modifiedSelector);

  return globalSelectors.length === 1 ? globalSelectors[0] : containSelector;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从屏幕网格选择 10*10 个点位，如果是点位对应的元素 form 子元素，则当前 form 得分加1，遍历所有点位，找出得分最多的 form 元素，作为当前视图正在处理的 form 元素
 */
export function getClosestForm(): HTMLFormElement | null {
  const forms = Array.from(document.querySelectorAll('form'));

  if (forms.length === 0) return null;

  if (forms.length === 1) return forms[0] as HTMLFormElement;

  const gridSize = 10;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const stepX = screenWidth / gridSize;
  const stepY = screenHeight / gridSize;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      points.push({ x: stepX * i + stepX / 2, y: stepY * j + stepY / 2 });
    }
  }

  const formScores = new Map<HTMLFormElement, number>();

  points.forEach(({ x, y }) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!element) return;

    const form = element.closest('form');
    if (form) {
      formScores.set(form, (formScores.get(form) || 0) + 1);
    }
  });

  let closestForm: HTMLFormElement | null = null;
  let maxScore = 0;

  formScores.forEach((score, form) => {
    if (score > maxScore) {
      maxScore = score;
      closestForm = form;
    }
  });

  return closestForm;
}

let currentForm: HTMLFormElement | null = null;

export function getCurrentForm() {
  if (!currentForm) {
    setCurrentForm();
  }
  return currentForm;
}

export function setCurrentForm() {
  const form = getClosestForm();
  currentForm = form;
}

export async function focusTo(element: HTMLElement | null) {
  // if (element) {
  //   element.scrollIntoView({
  //     behavior: 'smooth',
  //     block: 'center',
  //     inline: 'center',
  //   });
  //   await sleep(50);
  // }
}

export function getTextContentWithSpace(element: Node) {
  const textNodes: string[] = [];

  function collectTextNodes(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        if (node.parentNode?.nodeName.toLowerCase() === 'textarea') {
          textNodes.push(`<textarea>${text}</textarea>`);
        } else {
          textNodes.push(text);
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const childNode of Array.from(node.childNodes)) {
        collectTextNodes(childNode);
      }
    }
  }

  collectTextNodes(element);

  return textNodes.join(' ');
}

export function getCurrentFormInfo() {
  const form = getCurrentForm();

  if (!form) return null;

  const fields = Array.from(form.querySelectorAll('[x-field-id]'));

  const formInfo = fields.map((f) => ({
    field: f.getAttribute('x-field-id') as string,
    text: getTextContentWithSpace(f),
  }));

  return formInfo;
}
