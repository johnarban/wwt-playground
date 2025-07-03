import { engineStore } from '@wwtelescope/engine-pinia';
export interface WWTEngineStore extends ReturnType<typeof engineStore> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $wwt?: any;
}


export type Degree = number;
export type Radian = number;
export type HourAngle = number;
export type Pixel = number;


export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};