import { WWTControl } from "@wwtelescope/engine";
import type { engineStore } from '@wwtelescope/engine-pinia';

// ─── Camera view type ────────────────────────────────────────────────────────

export interface CameraView {
  lng: number;
  lat: number;
  zoomDeg: number;
  rotationDeg: number;
  angleDeg: number;
  opacity: number;
}

/**
 * Move the WWT camera to the given view without changing the tracked object.
 * followed google codewiki advice
**/
export function moveViewCamera(view: CameraView, instant = false): void {
  const control = WWTControl.singleton;
  const rc = control.renderContext;

  rc.targetCamera.lat      = view.lat;
  rc.targetCamera.lng      = view.lng;
  rc.targetCamera.zoom     = view.zoomDeg;
  rc.targetCamera.rotation = view.rotationDeg;
  rc.targetCamera.angle    = view.angleDeg;
  rc.targetCamera.opacity  = view.opacity;

  if (instant) {
    rc.viewCamera.lat      = rc.targetCamera.lat;
    rc.viewCamera.lng      = rc.targetCamera.lng;
    rc.viewCamera.zoom     = rc.targetCamera.zoom;
    rc.viewCamera.rotation = rc.targetCamera.rotation;
    rc.viewCamera.angle    = rc.targetCamera.angle;
    rc.viewCamera.opacity  = rc.targetCamera.opacity;
  }

  control.renderOneFrame();
}

let wwtReady = false;
export async function waitForWWTReady(store: ReturnType<typeof engineStore>): Promise<void> {
  // by @Carifio24
  if (wwtReady) {
    return;
  }
  return store.waitForReady().then(() => {
    WWTControl.singleton.renderOneFrame();
    wwtReady = true;
  });
}

export function renderOneFrame() {
  WWTControl.singleton.renderOneFrame();
}



const addedToFrame: (()=>void)[] = [];
let isRenderLoopPatched = false;
function ensureRenderLoopPatched() {
  if (isRenderLoopPatched) return;

  const originalRenderOneFrame = WWTControl.singleton.renderOneFrame;
  const newRenderOneFrame = function() {
    originalRenderOneFrame.call(WWTControl.singleton);

    const callbacks = addedToFrame.slice();
    for (const cb of callbacks) {
      try {
        cb();
      } catch(e) {
        console.error('Error from added frame',e);
      }
    }
  };
  WWTControl.singleton.renderOneFrame = newRenderOneFrame;
  isRenderLoopPatched = true;
}

/**
 * Add a callback that runs once per WorldWide Telescope render frame by patching
 * `WWTControl.singleton.renderOneFrame`.
 *
 * If the same callback is provided again, it is skipped and a warning is logged.
 *
 * If `preRender` is `true`, one frame is rendered immediately before the callback is attached.
 *
 * Callback functions are added to a non-exported list: `addedToFrame`
 *
 * @param cb - The function to invoke after each call to `renderOneFrame`.
 * @param preRender - When `true`, renders one frame immediately before installing the callback.
 */
export function addToWWTRenderLoop(cb: () => void, preRender?: boolean) {
  // don't add the same function more than once
  if (addedToFrame.indexOf(cb) !== -1) {
    console.warn(`Attempted to add ${cb} already in render loop. Skipping`);
    return;
  }

  ensureRenderLoopPatched();
  // pre-render the frame before adding // default is undefined
  if (preRender) WWTControl.singleton.renderOneFrame();

  addedToFrame.push(cb);
}


export function removeFromWWTRenderLoop(cb: () => void) {
  const idx = addedToFrame.indexOf(cb);
  if (idx === -1) return;
  // begin removing items at idx, and remove just 1
  addedToFrame.splice(idx, 1);
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable */

import { Coordinates } from "@wwtelescope/engine";

export function getCoordinatesForScreenPoint(x: number, y: number) {
    const pt = Vector2d.create(x, y);
    const planetMode = this.get_planetLike();

    if (planetMode) {
      const planetRadius = 1;

      const near = -1;
      const far = 1;
      const pointFar = this.transformPickPointToWorldSpace(pt, this.renderContext.width, this.renderContext.height, false, far);
      const pointNear = this.transformPickPointToWorldSpace(pt, this.renderContext.width, this.renderContext.height, false, near);
      const diff = Vector3d.create(pointFar.x - pointNear.x, pointFar.y - pointNear.y, pointFar.z - pointNear.z);
      diff.normalize();

      const b = 2 * Vector3d.dot(pointNear, diff);
      const pointNearLenSq = Vector3d.getLengthSq(pointNear);
      const c = pointNearLenSq - planetRadius * planetRadius;
      const discriminant = b * b - 4 * c;
      const sqrtD = Math.sqrt(discriminant);
      const t0 = -(b + sqrtD) / 2;
      const t1 = (-b + sqrtD) / 2;
      const t = t0 > 0 ? t0 : (t1 > 0 ? t1 : null);

      if (t == null) {
        return null;
      }

      const pWorld = Vector3d.create(
        pointNear.x + t * diff.x,
        pointNear.y + t * diff.y,
        pointNear.z + t * diff.z,
      );

      const latLon = Coordinates.cartesianToLatLng(pWorld);
      latLon.x -= 180;
      return latLon;
    } else {
      const PickRayDir = this.transformPickPointToWorldSpace(pt, this.renderContext.width, this.renderContext.height);
      return Coordinates.cartesianToSphericalSky(PickRayDir);
    }
}

export function transformPickPointToWorldSpace(ptCursor, backBufferWidth, backBufferHeight, normalize=true, z=-1) {
    var vPickRayDir = new Vector3d();

    // It is possible for this function to be called before the RenderContext is
    // set up, in which case the Projection is null. In that case we'll leave the
    // vector at its 0,0,0 default.

    if (this.renderContext.get_projection() != null) {

        // We start with an (x, y) point in screen space
        // This next block converts its to a point [vx, vy, z] where vx, vy are in [-1, 1]
        // i.e. clip space
        // We're also accounting for the fact that pixel coordinates run down the screen,
        // but clip space goes upwards (like we're used to for y).
        var v = new Vector3d();
        v.x = (((2 * ptCursor.x) / backBufferWidth) - 1);
        v.y = -(((2 * ptCursor.y) / backBufferHeight) - 1);
        v.z = z;

        var m = Matrix3d.multiplyMatrix(this.renderContext.get_world(), this.renderContext.get_view());
        m = Matrix3d.multiplyMatrix(m, this.renderContext.get_projection());
        m.invert();

        // Transform the screen space pick ray into 3D space
        // w here is always 1
        var d = v.x * m.get_m14() + v.y * m.get_m24() + v.z * m.get_m34() + m.get_m44();

        vPickRayDir.x = (v.x * m.get_m11() + v.y * m.get_m21() + v.z * m.get_m31() + m.get_offsetX()) / d;
        vPickRayDir.y = (v.x * m.get_m12() + v.y * m.get_m22() + v.z * m.get_m32() + m.get_offsetY()) / d;
        vPickRayDir.z = (v.x * m.get_m13() + v.y * m.get_m23() + v.z * m.get_m33() + m.get_offsetZ()) / d;
        if (normalize) {
          vPickRayDir.normalize();
        }
    }

    return vPickRayDir;
}

export function transformWorldPointToPickSpace(worldPoint, backBufferWidth, backBufferHeight) {
    var m = Matrix3d.multiplyMatrix(this.renderContext.get_world(), this.renderContext.get_view());
    m = Matrix3d.multiplyMatrix(m, this.renderContext.get_projection());

    var d = worldPoint.x * m.get_m14() + worldPoint.y * m.get_m24() + worldPoint.z * m.get_m34() + m.get_m44();
    var vx = (worldPoint.x * m.get_m11() + worldPoint.y * m.get_m21() + worldPoint.z * m.get_m31() + m.get_m41()) / d;
    var vy = (worldPoint.x * m.get_m12() + worldPoint.y * m.get_m22() + worldPoint.z * m.get_m32() + m.get_m42()) / d;

    var p = new Vector2d();
    p.x = Math.round((1 + vx) * backBufferWidth / 2);
    p.y = Math.round((1 - vy) * backBufferHeight / 2);

    return p;
}

// In Sky mode, (lon, lat) means (ra, dec)
export function getScreenPointForCoordinates(lon, lat) {
    var planetMode = this.get_planetLike();
    var cartesian;
    if (planetMode) {
      lon += 180;
      cartesian = Coordinates.geoTo3d(lat, lon);
    } else {
      var pt = Vector2d.create(lon, lat);
      cartesian = Coordinates.sphericalSkyToCartesian(pt);
    }
    var result = this.transformWorldPointToPickSpace(cartesian, this.renderContext.width, this.renderContext.height);
    return result;
}

