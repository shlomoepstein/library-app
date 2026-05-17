const getSize = node => {
   const {width, height} =
      node.getBoundingClientRect();
   return {width, height};
};


const getOffsetBounds = (
         viewportSize,
         nodeSize) => ({
   minX: 0,
   maxX: viewportSize.width
          - nodeSize.width,
   minY: 0,
   maxY: viewportSize.height
          - nodeSize.height
});


const clamp = (value, min, max) =>
   Math.min(max, Math.max(min, value));


const identity = x => x;


const clampOffset =
      ({minX, maxX, minY, maxY}) =>
      ({x, y}) => ({
   x: clamp(x, minX, maxX),
   y: clamp(y, minY, maxY)
});


const computeVelocity = recentMoves => {
   if (recentMoves.length < 2) {
      return {dx: 0, dy: 0};
   }

   const first = recentMoves.at(0);
   const last = recentMoves.at(-1);

   const dt = last.t - first.t;

   if (dt === 0) {
      return {dx: 0, dy: 0};
   }

   return {
      dx: (last.x - first.x) / dt,
      dy: (last.y - first.y) / dt
   };
};




const makeMotionController = (
         initialOffset,
         renderOffset,
         transformOffset = identity) => {

   const offset = {x: 0, y: 0};

   const writeOffset = ({x, y}) => {
      offset.x = x;
      offset.y = y;
   };

   const setOffset = newOffset => {
      writeOffset(transformOffset(newOffset));
      renderOffset(offset);
   };

   const applyDelta = ({dx, dy}) => {
      setOffset({
         x: offset.x + dx,
         y: offset.y + dy
      });
   };

   setOffset(initialOffset);

   return {
      getOffset: () => ({...offset}),
      setOffset,
      applyDelta
   };
};


const startMomentum = ({
         controller,
         velocity,
         halfLife = 150,
         minVelocity = 0.01,
         setFrameId}) => {

   let previous =
      document.timeline.currentTime;
   let {dx, dy} = velocity;

   const step = timestamp => {
      const timeDelta = timestamp - previous;

      controller.applyDelta({
         dx: dx * timeDelta,
         dy: dy * timeDelta
      });

      const decay =
         0.5 ** (timeDelta / halfLife);

      dx *= decay;
      dy *= decay;
      previous = timestamp;

      if (Math.hypot(dx, dy) < minVelocity) {
         setFrameId(null);
         return;
      }

      setFrameId(requestAnimationFrame(step));
   };

   if (Math.hypot(dx, dy) > minVelocity) {
      setFrameId(requestAnimationFrame(step));
   }
};


const bindPointerDrag = (
      element,
      controller,
      halfLife) => {

   let dragging = false,
       dragStart,
       offsetStart,
       recentMoves,
       momentumFrameId = null;

   element.addEventListener("pointerdown",
      event => {
         if (momentumFrameId !== null) {
            cancelAnimationFrame(
               momentumFrameId);
            momentumFrameId = null;
         }

         recentMoves = [];
         dragging = true;
         dragStart = {
            x: event.clientX,
            y: event.clientY
         };
         offsetStart = controller.getOffset();

         element.setPointerCapture(
            event.pointerId);
      });

   element.addEventListener("pointermove",
      event => {
         if (!dragging) {
            return;
         }

         controller.setOffset({
            x: offsetStart.x
                + event.clientX
                - dragStart.x,
            y: offsetStart.y
                + event.clientY
                - dragStart.y
         });

         const now = performance.now();
         recentMoves.push({
            t: now,
            x: event.clientX,
            y: event.clientY
         });
         recentMoves =
            recentMoves.filter(
               move =>
                  now - move.t < 100);
      });

   element.addEventListener("pointerup",
      event => {
         dragging = false;
         element.releasePointerCapture(
            event.pointerId);

         startMomentum({
            controller,
            velocity: computeVelocity(
               recentMoves),
            halfLife,
            setFrameId: (id) => {
               momentumFrameId = id;
            }
         });
      });
};




const canvas = (() => {
   const canvasNode =
      document.querySelector(".canvas");
   const viewportNode =
      document.querySelector(
         ".canvas-viewport");

   const viewportSize = getSize(viewportNode);

   const initialOffset = {
      x: viewportSize.width / 2,
      y: viewportSize.height / 2
   };

   const renderOffset = ({x, y}) => {
      canvasNode.style.transform =
         `translate(${x}px, ${y}px)`;
      viewportNode.style.backgroundPosition =
         `${x}px ${y}px`;
   };

   const controller = makeMotionController(
      initialOffset,
      renderOffset);

   bindPointerDrag(viewportNode, controller, 50);
})();


const detailsPane = (() => {
   const paneNode =
      document.querySelector(".details-pane");
   const viewportNode =
      document.getElementById("viewport");

   const viewportSize = getSize(viewportNode);
   const paneSize = getSize(paneNode);

   const initialOffset = {
      x: viewportSize.width - paneSize.width,
      y: 0
   };

   const renderOffset = ({x, y}) => {
      paneNode.style.transform =
         `translate(${x}px, ${y}px)`;
   };

   const offsetBounds = getOffsetBounds(
      viewportSize,
      paneSize);

   const transformOffset =
      clampOffset(offsetBounds);

   const controller = makeMotionController(
      initialOffset,
      renderOffset,
      transformOffset);

   bindPointerDrag(paneNode, controller, 500);
})();


const sidebar = (() => {
   const sidebarNode =
      document.querySelector(".sidebar");
   const sidebarToggleNode =
      document.querySelector(
         ".sidebar-toggle");

   sidebarToggleNode.addEventListener("click",
      () => {
         sidebarNode.classList.toggle(
            "collapsed");
      });
})();
