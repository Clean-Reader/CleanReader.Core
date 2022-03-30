type EpubCFI = string;

interface Location {
	index: number,
	href: string,
	start: EpubCFI,
	end: EpubCFI,
	percentage: number
}

export default Location