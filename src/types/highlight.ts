interface Highlight {
    key: string;
    accessTime: string;
    createTime: string;
    color: string;
    paragraphCfi: string;
    cfiRange: string;
    chpaterName: string;
    pageNum: number;
    content: string;
}

export interface HighlightSlim{
    CfiRange: string,
    Color: string
}

export interface Color {
    name: string;
    code: string;
}

export default Highlight