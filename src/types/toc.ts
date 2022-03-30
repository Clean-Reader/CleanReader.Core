interface Toc {
    label: string;
    href: string;
    children?: Toc[]
}

export default Toc