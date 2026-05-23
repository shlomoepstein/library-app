const getSize = node => {
   const { width, height } = node.getBoundingClientRect();
   return { width, height };
};


const getOffsetBounds = (viewportSize, nodeSize) => ({
   minX: 0,
   maxX: viewportSize.width - nodeSize.width,
   minY: 0,
   maxY: viewportSize.height - nodeSize.height
});


const clamp = (value, min, max) => Math.min(max, Math.max(min, value));


const identity = x => x;


const clampOffset = ({ minX, maxX, minY, maxY }) =>
   ({ x, y }) => ({
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY)
   });


const computeVelocity = recentMoves => {
   if (recentMoves.length < 2) {
      return { vx: 0, vy: 0 };
   }

   const first = recentMoves.at(0);
   const last = recentMoves.at(-1);

   const dt = last.t - first.t;

   if (dt === 0) {
      return { vx: 0, vy: 0 };
   }

   return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
   };
};


const makeMotionSampler = () => {
   let samples = [];

   return {
      sample: ({ x, y }) => {
         const now = performance.now();

         samples.push({ t: now, x, y });

         samples = samples.filter(sample => now - sample.t < 100);
      },
      getVelocity: () => computeVelocity(samples),
      reset: () => {
         samples = [];
      }
   };
};




const makeMotionController = (initialOffset,
                              renderOffset,
                              transformOffset = identity) => {
   const offset = { x: 0, y: 0 };

   const writeOffset = ({ x, y }) => {
      offset.x = x;
      offset.y = y;
   };

   const setOffset = newOffset => {
      writeOffset(transformOffset(newOffset));
      renderOffset(offset);
   };

   const applyDelta = ({ dx, dy }) => {
      setOffset({
         x: offset.x + dx,
         y: offset.y + dy
      });
   };

   setOffset(initialOffset);

   return {
      getOffset: () => ({ ...offset }),
      setOffset,
      applyDelta
   };
};


const makeMomentum = ({ controller,
                        velocity,
                        halfLife = 150,
                        minVelocity = 0.01 }) => {
   let previous,
       { vx, vy } = velocity,
       frameId = null;

   const step = timestamp => {
      const dt = timestamp - previous;

      controller.applyDelta({
         dx: vx * dt,
         dy: vy * dt
      });

      const decay = 0.5 ** (dt / halfLife);

      vx *= decay;
      vy *= decay;
      previous = timestamp;

      if (Math.hypot(vx, vy) < minVelocity) {
         frameId = null;
         return;
      }

      frameId = requestAnimationFrame(step);
   };

   return {
      start: () => {
         if (Math.hypot(vx, vy) > minVelocity) {
            previous = document.timeline.currentTime;
            frameId = requestAnimationFrame(step);
         }
      },
      cancel: () => {
         if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
         }
      }
   };
};


const onDrag = (element, { onDragStart, onDragMove, onDragEnd }) => {

   let dragging = false,
       dragStart;

   element.addEventListener("pointerdown", event => {
      dragging = true;
      element.setPointerCapture(event.pointerId);

      dragStart = {
         x: event.clientX,
         y: event.clientY
      };

      onDragStart?.();
   });

   element.addEventListener("pointermove", event => {
      if (!dragging) {
         return;
      }

      onDragMove?.({
         x: event.clientX,
         y: event.clientY,
         dx: event.clientX - dragStart.x,
         dy: event.clientY - dragStart.y
      });
   });

   element.addEventListener("pointerup", event => {
      dragging = false;
      element.releasePointerCapture(event.pointerId);

      onDragEnd?.();
   });
};


const makeDraggable = (element, controller, makeMomentum) => {

   const motion = makeMotionSampler();
   let   momentum,
         offsetStart;

   const onDragStart = () => {
      momentum?.cancel();
      motion.reset();
      offsetStart = controller.getOffset();
   };

   const onDragMove = ({ x, y, dx, dy }) => {
      controller.setOffset({
         x: offsetStart.x + dx,
         y: offsetStart.y + dy
      });
      motion.sample({ x, y });
   };

   const onDragEnd = () => {
      momentum = makeMomentum?.(controller, motion.getVelocity());
      momentum?.start();
   };

   onDrag(element, { onDragStart, onDragMove, onDragEnd });
};




const momentum = halfLife =>
   (controller, velocity) =>
      makeMomentum({
         controller,
         velocity,
         halfLife
      });




const canvas = (() => {
   const canvasNode = document.querySelector(".canvas");
   const viewportNode = document.querySelector(".canvas-viewport");

   const viewportSize = getSize(viewportNode);

   const initialOffset = {
      x: viewportSize.width / 2,
      y: viewportSize.height / 2
   };

   const renderOffset = ({x, y}) => {
      canvasNode.style.transform = `translate(${x}px, ${y}px)`;
      viewportNode.style.backgroundPosition = `${x}px ${y}px`;
   };

   const controller = makeMotionController(initialOffset, renderOffset);

   makeDraggable(viewportNode, controller, momentum(50));
})();


const detailsPane = (() => {
   const paneNode = document.querySelector(".details-pane");
   const viewportNode = document.getElementById("viewport");

   const viewportSize = getSize(viewportNode);
   const paneSize = getSize(paneNode);

   const initialOffset = {
      x: viewportSize.width - paneSize.width,
      y: 0
   };

   const renderOffset = ({x, y}) => {
      paneNode.style.transform = `translate(${x}px, ${y}px)`;
   };

   const offsetBounds = getOffsetBounds(viewportSize, paneSize);

   const transformOffset = clampOffset(offsetBounds);

   const controller = makeMotionController(initialOffset,
                                           renderOffset,
                                           transformOffset);

   makeDraggable(paneNode, controller, momentum(500));
})();


const sidebar = (() => {
   const sidebarNode = document.querySelector(".sidebar");
   const sidebarToggleNode = document.querySelector(".sidebar-toggle");

   sidebarToggleNode.addEventListener("click", () => {
      sidebarNode.classList.toggle("collapsed");
   });
})();
