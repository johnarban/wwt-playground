



export function addClickNoDragListeners(el: HTMLElement, onClick: (event: MouseEvent) => void) {
  // based on https://stackoverflow.com/a/59957974/11594175
  let dragged: boolean = false;
  let isMouseDown: boolean = false;
  el.addEventListener('mousedown', () => {
    isMouseDown = true;
  });
  el.addEventListener('mousemove', () => {
    if (isMouseDown) {
      dragged = true;
    }
  });

  function innerOnClick(event: MouseEvent) {
    isMouseDown = false;
    if (dragged) {
      // 'click' event comes after (with?) mouseup
      dragged = false;
      return ;
    }
    onClick(event);
  }
  el.addEventListener('click', innerOnClick);
}