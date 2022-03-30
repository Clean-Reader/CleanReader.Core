const viewerStyle = {
    "::selection": {
        "background-color": "#d4e9ff"
    },

    "img": {
        "-webkit-touch-callout": "none",
        "-webkit-user-select": "none",
        "-khtml-user-select": "none",
        "-moz-user-select": "none",
        "-ms-user-select": "none",
        "user-select": "none"
    }
}

export const epubStyles: {
	boxSizing: any,
	margin: any,
	width: any,
	height: any,
	overflowY: any
} = {
	boxSizing: "border-box",
	margin: "0px auto",
	width: "100%",
	height: "100%",
	overflowY: 'hidden'
}

export default viewerStyle