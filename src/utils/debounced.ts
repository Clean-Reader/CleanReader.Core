export class Debounced {

    /**
     *
     * @param fn 要执行的函数
     * @param awit  时间
     * @param immediate 是否在触发事件后 在时间段n开始，立即执行，否则是时间段n结束，才执行
     */
    static use(func: Function, time: number, immediate = false) {
        let timer: number | null = null;
        return (...args: any) => {
            if (timer) clearInterval(timer)
            if (immediate) {
                if (!timer) func.apply(this, args);
                timer = window.setTimeout(() => {
                    timer = null
                }, time)
            } else {
                timer = window.setTimeout(() => {
                    func.apply(this, args)
                }, time)
            }
        }
    }

}