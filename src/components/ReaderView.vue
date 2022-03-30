<template>
    <epub-reader
        :url="state.url"
        :style="state.layoutStyle"
        :startCfi="state.startCfi"
        :initLocations="state.initLocations"
        :initHighlights="state.initHighlights"
        :scrollBehavior="state.bookOption.scrollBehavior"
        ref="reader"
        @book-changed="bookChanged"
        @rendition-changed="renditionChanged"
        @toc-changed="tocChanged"
        @page-changed="pageChanged"
        @selection-changed="selectionChanged"
    />
</template>

<script setup lang="ts">
import { Book, Rendition, Contents } from "epubjs"
import { reactive, watch, onMounted, getCurrentInstance } from "vue";
import EpubReader from './EpubReader.vue';
import { timeFormatter } from '../utils/commonUtil'
import { BookType, BookStyle, BookOption } from '../types/book'
import ViewerLayout from "../types/viewerLayout";
import viewerDefaultStyles from './viewerStyle';
import Toc from "../types/toc";
import Page from "../types/page";
import { HighlightSlim } from "../types/highlight";
import '../utils/resizeUtil'
import useWindowResize from "../utils/resizeUtil";
import { Debounced } from "../utils/debounced";

interface IViewState {
    url: string,
    book: Book | null;
    startCfi: string;
    initLocations: string;
    initHighlights: HighlightSlim[],
    viewerLayout: ViewerLayout | null;
    rendition: Rendition | null;
    layoutStyle: { [key: string]: any };
    bookStyle: BookStyle;
    bookOption: BookOption;
    currentSelection: { cfiRange: string, contents: Contents | null }
    size: { width: number, height: number },
}

const state: IViewState = reactive({
    url: '',
    book: null,
    rendition: null,
    startCfi: '',
    initHighlights: [],
    initLocations: '',
    layoutStyle: {},
    bookStyle: {
        fontFamily: 'Origin',
        fontSize: 16,
        lineHeight: 1.4,
        background: 'transparent',
        foreground: 'black'
    },
    bookOption: {
        flow: "paginated",
        resizeOnOrientationChange: true,
        spread: "auto",
        minSpreadWidth: 1000,
        scrollBehavior: "smooth"
    },
    currentSelection: {
        cfiRange: '',
        contents: null,
    },
    viewerLayout: {
        MIN_VIEWER_WIDTH: 600,
        MIN_VIEWER_HEIGHT: 300,
        VIEWER_HEADER_HEIGHT: 0,
        VIEWER_FOOTER_HEIGHT: 0,
        VIEWER_SIDEMENU_WIDTH: 0
    },
    size: useWindowResize(),
});

onMounted(() => {
    window.reader = getCurrentInstance();
})

watch(
    () => state.size.width,
    () => {
        initializeLayout();
    }
);

watch(
    () => state.size.height,
    () => {
        initializeLayout();
    }
);

watch(
    () => state.book,
    () => initializeBookInfo
);

const bookChanged = (book: Book) => state.book = book;
const renditionChanged = (rendition: Rendition) => {
    state.rendition = rendition;
    initializeStyle();
}
const selectionChanged = (cfiRange: string, contents: Contents) => state.currentSelection = { cfiRange, contents };
const tocChanged = (toc: Toc[]) => console.log(toc);
const pageChanged = (page: Page) => console.log(page);

function setStyle(style: BookStyle) {
    state.bookStyle = style;
    initializeStyle();
}

function setOptions(isScroll: boolean, minSpreadWidth?: number, isSmoothScroll?: boolean) {
    state.bookOption = {
        flow: isScroll ? "scrolled-doc" : "paginated",
        spread: "auto",
        resizeOnOrientationChange: true,
        minSpreadWidth: minSpreadWidth ?? 1000,
        scrollBehavior: isSmoothScroll ? "smooth" : "auto",
    }
    initializeStyle();
}

function setBook(url: string, isScroll: boolean, startCfi: string, initialLocations: string, initHightlights: string, minSpreadWidth?: number, isSmoothScroll?: boolean) {
    state.url = url;
    state.bookOption = {
        flow: isScroll ? "scrolled-doc" : "paginated",
        spread: "auto",
        resizeOnOrientationChange: true,
        minSpreadWidth: minSpreadWidth ?? 1000,
        scrollBehavior: isSmoothScroll ? "smooth" : "auto",
    }
    if (initHightlights) {
        state.initHighlights = JSON.parse(initHightlights);
    }
    state.startCfi = startCfi;
    state.initLocations = initialLocations;
}

function setChapter(href: string) {
    if (!state.rendition || !href) return;
    state.rendition.display(href);
}

function setFlow(isScroll: boolean = false) {
    state.bookOption.flow = isScroll ? "scrolled-doc" : "paginated";
    initializeStyle();
}

function setHighlight(cfiRange: string, color: string) {
    window.epubReader.exposed.highlight(cfiRange, color);
}

function search(text: string) {
    window.epubReader.exposed.search(text);
}

function changeLocation(cfi: string) {
    if (!state.rendition || !cfi) return;
    state.rendition.display(cfi);
}

function initializeLayout() {
    if (!state.rendition) return;

    const viewerLayout_ = state.viewerLayout || {
        MIN_VIEWER_WIDTH: 600,
        MIN_VIEWER_HEIGHT: 300,
        VIEWER_HEADER_HEIGHT: 0,
        VIEWER_FOOTER_HEIGHT: 0,
        VIEWER_SIDEMENU_WIDTH: 0
    };

    const { innerWidth: win_w, innerHeight: win_h } = window;
    const componentHeight = viewerLayout_.VIEWER_HEADER_HEIGHT + viewerLayout_.VIEWER_FOOTER_HEIGHT;
    const w = win_w - ~~((win_w - viewerLayout_.MIN_VIEWER_WIDTH) / 100 * 0);
    const h = state.bookOption.flow === "scrolled-doc"
        ? win_h - componentHeight
        : win_h - componentHeight - ~~((win_h - componentHeight - viewerLayout_.MIN_VIEWER_HEIGHT) / 100 * 0);
    const marginVertical = state.bookOption.flow === "scrolled-doc"
        ? ""
        : `${~~((win_h - componentHeight - viewerLayout_.MIN_VIEWER_HEIGHT) / 100 * 0) / 2}px`;

    if (state.layoutStyle.width !== w || state.layoutStyle.height !== h || state.layoutStyle.marginTop !== marginVertical) {
        state.layoutStyle = {
            ...state.layoutStyle,
            width: w,
            height: h,
            marginTop: 0,
            marginBottom: 0
        };

    }

    try {
        state.rendition.resize(w, h);
    } catch { }
}

function initializeStyle() {
    if (!state.rendition) return;

    initializeLayout();

    const newStyle = {
        "body": {
            "padding": "0px !important",
            "background-color": `${state.bookStyle.background} !important`,
            "color": `${state.bookStyle.foreground}`,
        },
        "p": {
            "line-height": `${state.bookStyle.lineHeight} !important`
        },
    };

    state.rendition.flow(state.bookOption.flow);
    state.rendition.spread(state.bookOption.spread, state.bookOption.minSpreadWidth);

    if (state.bookStyle.fontFamily !== "Origin") {
        Object.assign(newStyle.body, {
            "font-family": `${state.bookStyle.fontFamily} !important`
        });
    }

    if (state.bookStyle.additionalStyle) {
        Object.assign(newStyle, state.bookStyle.additionalStyle);
    }

    if (state.bookOption.flow === "scrolled-doc") {   // Scroll type
        Object.assign(newStyle.body, {
            "margin": "auto !important"
        });
    } else if (state.bookOption.spread === "auto") {  // View 2 pages
        Object.assign(newStyle.body, {});
    } else {                                    // View 1 page
        Object.assign(newStyle.body, {});
    }

    state.rendition.themes.register("main", viewerDefaultStyles);
    state.rendition.themes.register("custom", newStyle);

    state.rendition.themes.select("custom");
    state.rendition.themes.override('color', state.bookStyle.foreground);
    state.rendition.themes.fontSize(state.bookStyle.fontSize + "px");
    document.body.style.background = state.bookStyle.background;
}

function initializeBookInfo() {
    if (!state.book) return;
    Promise.all([
        state.book.loaded.metadata,
        state.book.opened
    ])
        .then(([metaData, bookData]: any[]) => {
            const newBookData: BookType = {
                coverURL: bookData.archive.urlCache[bookData.cover],
                title: metaData.title,
                description: metaData.description,
                published_date: timeFormatter(new Date(metaData.pubdate)),
                modified_date: timeFormatter(new Date(metaData.modified_date)),
                author: metaData.creator,
                publisher: metaData.publisher,
                language: metaData.language
            }

            // onBookInfoChange(newBookData);
            console.log(`书籍信息: ${newBookData}`);
        })
        .catch(error => {
            throw `${error.stack} \n\n Message : Epub parsing failed.`;
        });
}

defineExpose({
    setBook,
    setFlow,
    setChapter,
    setStyle,
    setOptions,
    setHighlight,
    search,
    changeLocation,
})
</script>