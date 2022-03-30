import Vue from "vue";
declare module "vue" {
  export type PluginObject<T> = (app: Vue.App, ...options: any[]) => any;
}