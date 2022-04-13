<template>
  <div v-if="state.isLoaded" id="reader-area"></div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, watch, getCurrentInstance } from "vue";
import { Book, Contents, Rendition } from "epubjs-cr";
import Toc from "../types/toc";
import Loc from "../types/location";
import Page from "../types/page";
import { HighlightSlim } from "../types/highlight";
import Locations from "epubjs-cr/types/locations";
import { RenditionOptions } from "epubjs-cr/types/rendition";
import { BookOptions } from "epubjs-cr/types/book";

interface IReaderState {
  isLoaded: boolean;
  book: Book | null;
  rendition: Rendition | null;
  currentCfi: string;
  isScrolling: boolean;
  touchEvent: any;
  bookElement?: HTMLElement;
  selectedEvent?: any;
  tempLocation: any;
  justResized: boolean;
  correcting: boolean;
}

interface IReaderProps {
  url: string;
  epubFileOptions?: BookOptions;
  epubOptions?: RenditionOptions;
  startCfi?: string;
  initHighlights?: HighlightSlim[];
  initLocations?: string;
  scrollBehavior?: string;
}

interface IReaderEvents {
  (e: "bookChanged", book: Book): void;
  (e: "renditionChanged", rendition: Rendition): void;
  (e: "pageChanged", page: Page): void;
  (e: "tocChanged", value: Toc[]): void;
  (e: "selectionChanged", cfiRange: string, contents: Contents): void;
}

const state: IReaderState = reactive({
  isLoaded: false,
  book: null,
  rendition: null,
  currentCfi: "",
  isScrolling: false,
  isInSelectionMode: false,
  touchEvent: {},
  selectedEvent: {},
  tempLocation: null,
  justResized: false,
  correcting: false,
});

const props = withDefaults(defineProps<IReaderProps>(), {
  url: "",
});
const emit = defineEmits<IReaderEvents>();

onMounted(() => {
  window.epubReader = getCurrentInstance();
});

function search(text: string) {
  if (!state.book) return;
  var data = Promise.all(
    (<any>state.book.spine).spineItems.map((item) =>
      item
        .load(state?.book?.load.bind(state?.book))
        .then(item.find.bind(item, text))
        .finally(item.unload.bind(item))
    )
  )
    .then((results) => Promise.resolve([].concat.apply([], results)))
    .then((e) => {
      if (e.length > 0) {
        (<any[]>e).map((item) => {
          let spineItem = state.book?.spine.get(item.cfi);
          let navItem = state.book?.navigation.get(spineItem?.href || "");
          item.chapter = navItem?.label.trim();
        });
      }

      sendMessage("Search", e);
    });
}

function handleKeyPress(key: KeyboardEvent) {
  if (key.code === "ArrowLeft") movePage("PREV");
  else if (key.code === "ArrowRight") movePage("NEXT");
}

function movePage(type: "PREV" | "NEXT") {
  if (!state.rendition) return;
  if (type == "PREV") state.rendition.prev();
  else state.rendition.next();
}

function changeLocation(loc: Loc) {
  if (!state.book) return;

  const startCfi = loc && loc.start;
  const endCfi = loc && loc.end;
  const base = loc && loc.start.slice(8).split("!")[0];

  const spineItem = state.book.spine.get(startCfi);
  const navItem = state.book.navigation.get(spineItem.href);
  const chapterName = navItem && navItem.label.trim();
  const chapterId = navItem && navItem.id;
  const chapterHref = spineItem.href;

  const locations: any = state.book.locations;
  const currentPage = locations.locationFromCfi(startCfi);
  const totalPage = locations.total;

  sendMessage("Progress", {
    chapterId,
    chapterHref,
    chapterName,
    currentPage,
    totalPage,
    startCfi,
    endCfi,
    base,
  });

  state.currentCfi = startCfi;
  InitializeHighlighClicks();
}

function highlight(cfiRange: string, color?: string) {
  if (!state.rendition) return;
  state.rendition.annotations.remove(cfiRange, "highlight");
  state.rendition.annotations.highlight(
    cfiRange,
    {},
    () => { },
    "epub-highlight",
    {
      fill: color || "#fdf183",
    }
  );
  InitializeHighlighClicks();
}

function offHighlight(cfiRange: string) {
  if (!state.rendition) return;
  state.rendition.annotations.remove(cfiRange, "highlight");
}

watch(
  () => state.rendition,
  (rendition, prevRendition) => {
    if (prevRendition) {
      document.removeEventListener("keyup", handleKeyPress, false);
      prevRendition.off("keyup", handleKeyPress);
      prevRendition.off("locationChanged", changeLocation);
      prevRendition.off("selected", onSelectionChanged);
      prevRendition.off("relocated", onRelocated);
      prevRendition.off("resized", onResized);
    }
    if (!rendition) return;
    document.addEventListener("keyup", handleKeyPress, false);
    rendition.on("keyup", handleKeyPress);
    rendition.on("locationChanged", changeLocation);
    rendition.on("selected", onSelectionChanged);
    rendition.on("relocated", onRelocated);
    rendition.on("resized", onResized);
    rendition.hooks.content.register(initializeContents);
    emit("renditionChanged", rendition);
  }
);

watch(
  () => props.url,
  (url, prevUrl) => {
    if (!url) return;
    if (state.book) {
      state.book.destroy();
    }

    state.book = new Book('', props.epubFileOptions);
    emit("bookChanged", state.book);

    state.book.loaded.navigation
      .then(({ toc }) => {
        state.isLoaded = true;
        sendMessage("Toc", toc);
      })
      .catch(() => {
        sendMessage("Failed", "Toc");
      });

    state.book.ready
      .then(() => {
        if (!state.book) return;

        sendMessage("Initialized", {});
        if (!props.initLocations) {
          (<Promise<string[]>>state.book.locations.generate(1000)).then(() => {
            sendMessage("Locations", state.book?.locations.save());
          });
        } else {
          state.book.locations.load(props.initLocations);
        }

        if (state.book.spine) {
          let loc = props.startCfi;
          if (!loc) {
            loc = state.book.rendition?.location?.start?.cfi;
          }

          const rendition_ = state.book.renderTo("reader-area", {
            width: "100%",
            height: "100%",
            ...props.epubOptions,
          });

          state.rendition = rendition_;

          if (props.initHighlights) {
            props.initHighlights.forEach((p) => {
              state.rendition?.annotations.highlight(
                p.CfiRange,
                {},
                () => { },
                "epub-highlight",
                {
                  fill: p.Color,
                }
              );
            });
          }

          if (loc) {
            rendition_.display(loc);
          } else {
            rendition_.display();
          }
        }
      });

    state.book.open(props.url, "epub").catch(e => sendMessage("Failed", "Book"));
  }
);

watch(
  () => props.startCfi,
  (loc, prevLoc) => {
    if (!loc) return;
    state.rendition?.display(loc);
  }
);

function initializeContents(content: Contents) {
  const el = content.document.documentElement;
  state.bookElement = el;
  if (el) {
    el.addEventListener("touchstart", touchStartEvent, true);
    el.addEventListener("touchmove", touchMoveEvent, true);
    el.addEventListener("touchcancel", touchCancelEvent);
    el.addEventListener("touchend", touchEndEvent);
    el.addEventListener("mousedown", touchStartEvent);
    el.addEventListener("mousemove", touchMoveEvent);
    el.addEventListener("mouseup", touchEndEvent);
    el.addEventListener("wheel", onWheel);
  }
}

function touchX(event) {
  if (event.type.indexOf("mouse") !== -1) {
    return event.clientX;
  }
  return event.touches[0].clientX;
}

function touchY(event) {
  if (event.type.indexOf("mouse") !== -1) {
    return event.clientY;
  }
  return event.touches[0].clientY;
}

function touchStartEvent(event) {
  let $this = state.touchEvent;
  let isTouchEvent = event.type.indexOf("touch") >= 0;
  let isMouseEvent = event.type.indexOf("mouse") >= 0;

  if (isTouchEvent) {
    $this.lastTouchStartTime = event.timeStamp;
  }

  if (
    isMouseEvent &&
    $this.lastTouchStartTime &&
    event.timeStamp - $this.lastTouchStartTime < 350
  ) {
    return;
  }

  if ($this.touchStarted) {
    return;
  }

  $this.touchStarted = true; // always true while the element is being PRESSED

  $this.touchMoved = false; // true only when the element is PRESSED and DRAGGED a bit
  $this.swipeOutBounded = false;

  $this.startX = touchX(event);
  $this.startY = touchY(event);

  $this.currentX = 0; // always updated with the last mouse X/Y while over the element
  $this.currentY = 0;

  $this.touchStartTime = event.timeStamp;
  $this.hasSwipe = true;
}

function touchMoveEvent(event) {
  let $this = state.touchEvent;

  let curX = touchX(event);
  let curY = touchY(event);

  $this.currentX = curX;
  $this.currentY = curY;

  if (!$this.touchMoved) {
    var tapTolerance = 10;

    $this.touchMoved =
      Math.abs($this.startX - $this.currentX) > tapTolerance ||
      Math.abs($this.startY - $this.currentY) > tapTolerance;
    // performance: only process swipe events if `swipe.*` event is registered on this element
  } else if ($this.hasSwipe && !$this.swipeOutBounded) {
    var swipeOutBounded = 30;

    $this.swipeOutBounded =
      Math.abs($this.startX - $this.currentX) > swipeOutBounded &&
      Math.abs($this.startY - $this.currentY) > swipeOutBounded;
  }
}

function touchCancelEvent() {
  let $this = state.touchEvent;

  $this.touchStarted = $this.touchMoved = false;
  $this.startX = $this.startY = 0;
}

function touchEndEvent(event) {
  let $this = state.touchEvent,
    isTouchEvent = event.type.indexOf("touch") >= 0,
    isMouseEvent = event.type.indexOf("mouse") >= 0;

  if (isTouchEvent) {
    $this.lastTouchEndTime = event.timeStamp;
  }

  $this.touchStarted = false;

  if (
    isMouseEvent &&
    $this.lastTouchEndTime &&
    event.timeStamp - $this.lastTouchEndTime < 350
  ) {
    return;
  }

  if (!$this.touchMoved) {
    if (state.selectedEvent && state.selectedEvent.Text) {
      let x = touchX(event);
      let y = touchY(event);
      if (
        x >= state.selectedEvent.X &&
        x <= state.selectedEvent.Right &&
        y >= state.selectedEvent.Y &&
        y <= state.selectedEvent.Bottom
      ) {
        sendMessage("ContextMenu", state.selectedEvent);
      } else {
        state.selectedEvent = null;
      }
    } else {
      onTap(event);
    }
    // performance: only process swipe events if `swipe.*` event is registered on this element
  } else {
    if (state.selectedEvent && state.selectedEvent.Text && !isTouchEvent) {
      sendMessage("ContextMenu", state.selectedEvent);
    } else if (isTouchEvent && $this.hasSwipe && !$this.swipeOutBounded) {
      state.selectedEvent = null;
      var swipeOutBounded = 30,
        direction,
        distanceY = Math.abs($this.startY - $this.currentY),
        distanceX = Math.abs($this.startX - $this.currentX);

      if (distanceY > swipeOutBounded || distanceX > swipeOutBounded) {
        if (distanceY > swipeOutBounded) {
          direction = $this.startY > $this.currentY ? "top" : "bottom";
        } else {
          direction = $this.startX > $this.currentX ? "left" : "right";
        }
        onSwipe(direction);
      }
    } else {
      state.selectedEvent = null;
    }
  }
}

function onSelectionChanged(range: any, contents: any) {
  if (!contents || !range) return;
  let selection = contents.window.getSelection();
  let text = selection?.toString();
  let rect = selection?.getRangeAt(0).getBoundingClientRect();
  let x = rect?.x;
  let y = rect?.y;
  let right = rect?.right;
  let bottom = rect?.bottom;
  state.selectedEvent = {
    Text: text,
    X: x,
    Y: y,
    Right: right,
    Bottom: bottom,
    Range: range,
  };
}

function onRelocated() {
  if (!state.rendition)
    return;
  if (!state.justResized) {
    if (!state.correcting) {
      // console.log('real relocation')
      state.tempLocation = (<any>state.rendition.currentLocation()).start.cfi
      // console.log(state.tempLocation);
    } else {
      // console.log('corrected')
      state.correcting = false
    }
  } else {
    // console.log('correcting')
    state.justResized = false
    state.correcting = true
    // console.log(`temp location: ${JSON.stringify(state.tempLocation)}`)
    state.rendition.display(state.tempLocation)
  }
}

function onResized() {
  state.justResized = true;
}

function onTap(e: MouseEvent | TouchEvent) {
  let x = 0;
  const m = <MouseEvent>e;
  if (m.offsetX) {
    x = m.screenX;
  } else {
    const t = <TouchEvent>e;
    x = t.changedTouches[0].screenX;
  }
  x = x - window.screenLeft;
  let clientWidth = document.documentElement.clientWidth;
  let sideWidth = clientWidth > 900 ? clientWidth / 3.0 : clientWidth / 4.0;
  if (x < sideWidth) {
    movePage("PREV");
  } else if (x > clientWidth - sideWidth) {
    movePage("NEXT");
  } else {
    // click center, popup controls panel.
    sendMessage("Menu", x);
  }
}

function onSwipe(e: string) {
  if (e == "left") {
    movePage("NEXT");
  } else if (e == "right") {
    movePage("PREV");
  }
}

function onWheel(e: WheelEvent) {
  if (state.isScrolling) return;
  state.isScrolling = true;
  if (e.deltaY > 0 || e.deltaX < 0) {
    movePage("NEXT");
  } else {
    movePage("PREV");
  }

  setTimeout(() => {
    state.isScrolling = false;
  }, 300);
}

function InitializeHighlighClicks() {
  if (!state.bookElement) return;
  let highlights = document.querySelectorAll(".epub-highlight");
  if (highlights.length > 0) {
    highlights.forEach((p) => {
      p.removeEventListener("mouseup", onHighlightTap);
      p.removeEventListener("touchend", onHighlightTap);
      p.addEventListener("mouseup", onHighlightTap);
      p.addEventListener("touchend", onHighlightTap);
    });
  }
}

function onHighlightTap(event) {
  let srcElement = event.srcElement;
  let parentElement = srcElement.parentElement;
  let cfiRange = parentElement.dataset.epubcfi;
  if (cfiRange) {
    sendMessage("ShowHighlight", cfiRange);
  }
}

function sendMessage(name: String, data: any) {
  var msg = JSON.stringify({
    Name: name,
    Path: props.url ?? "",
    Data: JSON.stringify(data),
  });
  if (window.chrome.webview) {
    window.chrome.webview.postMessage(msg);
  } else {
    console.log(msg);
  }
}

defineExpose({
  highlight,
  offHighlight,
  search,
});
</script>

<style>
#reader-area {
  box-sizing: border-box;
  margin: 0px auto;
  width: 100%;
  height: 100%;
  overflow-y: hidden;
}

#gesture-area {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 99;
  top: 0;
  left: 0;
}

.epub-highlight {
  pointer-events: all;
}

.epub-highlight:hover {
  cursor: pointer;
}

* {
  scroll-behavior: v-bind("props.scrollBehavior");
}

::-webkit-scrollbar {
  display: none;
}
</style>