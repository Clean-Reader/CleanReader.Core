export type BookType = {
	coverURL: string;
	title: string;
	description: string;
	published_date: string;
	modified_date: string;
	author: string;
	publisher: string;
	language: string;
}

export type BookStyle = {
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	background: string;
	foreground: string;
	additionalStyle?: any;
}

export type BookFlow = "paginated" | "scrolled-doc";

export type BookOption = {
	flow: BookFlow,
	resizeOnOrientationChange: boolean,
	spread: "auto" | "none",
	minSpreadWidth: number,
	scrollBehavior: "smooth" | "auto"
}