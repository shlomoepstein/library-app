const canvasViewport =
   document.getElementById("canvas-viewport");
const canvas =
   document.getElementById("canvas");
const detailsPane =
   document.querySelector(".details-pane");
const sidebar =
   document.querySelector(".sidebar");
const sidebarToggle =
   document.querySelector(".sidebar-toggle");


sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});



const clamp = (value, min, max) =>
   Math.min(max, Math.max(min, value));


function bindPointerDrag (
      element,
      offset,
      applyOffset,
      bounds) {

   let dragging = false,
       dragStart,
       offsetStart;

   element.addEventListener("pointerdown",
      event => {
         dragging = true;
         dragStart = {
            x: event.clientX,
            y: event.clientY
         };
         offsetStart = {...offset};

         element.setPointerCapture(
            event.pointerId);
      });

   element.addEventListener("pointermove",
      event => {
         if (!dragging) {
            return;
         }

         let x = offsetStart.x
                  + event.clientX
                  - dragStart.x;
         let y = offsetStart.y
                  + event.clientY
                  - dragStart.y;

         if (bounds) {
            const {minX, maxX, minY, maxY} = bounds;
            x = clamp(x, minX, maxX);
            y = clamp(y, minY, maxY);
         }

         offset.x = x;
         offset.y = y;

         applyOffset(offset);
      });

   element.addEventListener("pointerup",
      event => {
         dragging = false;
         element.releasePointerCapture(
            event.pointerId);
      });
}



const viewport = {
   width: window.innerWidth,
   height: window.innerHeight
};


const canvasOffset = {
   x: viewport.width / 2,
   y: viewport.height / 2
};

function applyCanvasOffset ({x, y}) {
   canvas.style.transform =
      `translate(${x}px, ${y}px)`;
   canvasViewport.style.backgroundPosition =
      `${x}px ${y}px`;
}

applyCanvasOffset(canvasOffset);

bindPointerDrag(
   canvasViewport,
   canvasOffset,
   applyCanvasOffset);


const {
   width: detailsPaneWidth,
   height: detailsPaneHeight
} = detailsPane.getBoundingClientRect();

const detailsPaneOffset = {
   x: viewport.width - detailsPaneWidth,
   y: 0
};

const detailsPaneBounds = {
   minX: 0,
   maxX: viewport.width - detailsPaneWidth,
   minY: 0,
   maxY: viewport.height - detailsPaneHeight
};

function applyDetailsPaneOffset ({x, y}) {
   detailsPane.style.transform =
      `translate(${x}px, ${y}px)`;
}

applyDetailsPaneOffset(detailsPaneOffset);

bindPointerDrag(
   detailsPane,
   detailsPaneOffset,
   applyDetailsPaneOffset,
   detailsPaneBounds);
