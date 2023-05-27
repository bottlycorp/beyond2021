import { getStringEnv } from "./utils/env";

export const hello = (): string => {
  return "Hello, world!";
};

export const helloGreg = (): string => {
  return `Yeah is ${getStringEnv("name")} !`;
};