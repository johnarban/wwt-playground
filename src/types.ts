import { engineStore } from '@wwtelescope/engine-pinia';
export type WWTEngineStore = ReturnType<typeof engineStore>;

export type Degree = number;
export type Radian = number;
export type HourAngle = number;
export type Pixel = number;


export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

