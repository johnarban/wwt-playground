// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable  */
import {
  Annotation,
  Constellations,
  // @ts-expect-error Grid does exist
  Grids,
  ImageSetLayer,
  LayerManager,
  LayerMap,
  Matrix3d,
  Planets,
  Planets3d,
  RenderTriangle,
  Settings,
  SpaceTimeController,
  SpreadSheetLayer,
  Tile,
  TileCache,
  TourPlayer,
  // @ts-expect-error Vector2d does exist
  Vector2d,
  Vector3d,
  WWTControl,
} from "@wwtelescope/engine";
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

// export function renderOneFrame() {
//   WWTControl.singleton.renderOneFrame();
// }



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

// In Sky mode, (x, y) means (ra, dec)
// In planet-like modes, (x, y) means (lon, lat)
export function getScreenPointForCoordinates(x, y, z=0) {
    var planetMode = this.get_planetLike();
    var cartesian;
    if (planetMode) {
      lon += 180;
      cartesian = Coordinates.geoTo3d(y, x);
    } else if (this.get_solarSystemMode()) {
      cartesian = Vector3d.create(x, y, z);
    } else {
      var pt = Vector2d.create(x, y);
      cartesian = Coordinates.sphericalSkyToCartesian(pt);
    }
    var result = this.transformWorldPointToPickSpace(cartesian, this.renderContext.width, this.renderContext.height);
    return result;
}

// export function getDepth(x, y, z) {
//   const pt = this.getScreenPointForCoordinates(x, y, z);
//   const near = -1;
//   const far = 1;
//   const nearPt = this.transformPickPointToWorldSpace(pt, this.renderContext.width, this.renderContext.height, true, near);
//   const farPt = this.transformPickPointToWorldSpace(pt, this.renderContext.width, this.renderContext.height, true, far);
//   // In principle, should give the same value for y and z
//   return (x - nearPt.x) / (farPt.x - nearPt.x);
// }

export function getDepth(x, y, z) {
    const worldPoint = Vector3d.create(x, y, z);
    var m = Matrix3d.multiplyMatrix(this.renderContext.get_world(), this.renderContext.get_view());
    m = Matrix3d.multiplyMatrix(m, this.renderContext.get_projection());

    var vz = (worldPoint.x * m.get_m13() + worldPoint.y * m.get_m23() + worldPoint.z * m.get_m33() + m.get_m43());

    return vz;
}

export function renderOneFrame() {
    if (this.renderContext.get_backgroundImageset() != null) {
        this.renderType = this.renderContext.get_backgroundImageset().get_dataSetType();
    } else {
        this.renderType = 2;
    }
    var sizeChange = false;
    if (this.canvas.width !== this.canvas.parentNode.clientWidth) {
        this.canvas.width = this.canvas.parentNode.clientWidth;
        sizeChange = true;
    }
    if (this.canvas.height !== this.canvas.parentNode.clientHeight) {
        this.canvas.height = this.canvas.parentNode.clientHeight;
        sizeChange = true;
    }
    if (sizeChange && this.explorer != null) {
        this.explorer.refresh();
    }

    if (this.canvas.width < 1 || this.canvas.height < 1) {
        // This can happen during initialization if perhaps some
        // HTML/JavaScript interaction hasn't happened to set the canvas
        // size correctly. If we don't exit this function early, we get
        // NaNs in our transformation matrices that lead IsTileBigEnough
        // to say "no" for everything so that we spin out of control
        // downloading maximum-resolution DSS tiles for an enormous
        // viewport. That's bad!
        return;
    }

    if (sizeChange) {
        // In GL, the crosshairs are in viewport coordinates
        // ([0,1]x[0,1]), so a size change alters their perceived aspect
        // ratio.
        this._crossHairs = null;
    }

    Tile.lastDeepestLevel = Tile.deepestLevel;
    RenderTriangle.width = this.renderContext.width = this.canvas.width;
    RenderTriangle.height = this.renderContext.height = this.canvas.height;
    Tile.tilesInView = 0;
    Tile.tilesTouched = 0;
    Tile.deepestLevel = 0;
    SpaceTimeController.set_metaNow(new Date());
    if (this.get__mover() != null) {
        SpaceTimeController.set_now(this.get__mover().get_currentDateTime());
        Planets.updatePlanetLocations(this.get_solarSystemMode());
        if (this.get__mover() != null) {
            var newCam = this.get__mover().get_currentPosition();
            this.renderContext.targetCamera = newCam.copy();
            this.renderContext.viewCamera = newCam.copy();
            if (this.renderContext.space && Settings.get_active().get_galacticMode()) {
                var gPoint = Coordinates.j2000toGalactic(newCam.get_RA() * 15, newCam.get_dec());
                this.renderContext.targetAlt = this.renderContext.alt = gPoint[1];
                this.renderContext.targetAz = this.renderContext.az = gPoint[0];
            }
            else if (this.renderContext.space && Settings.get_active().get_localHorizonMode()) {
                var currentAltAz = Coordinates.equitorialToHorizon(Coordinates.fromRaDec(newCam.get_RA(), newCam.get_dec()), SpaceTimeController.get_location(), SpaceTimeController.get_now());
                this.renderContext.targetAlt = this.renderContext.alt = currentAltAz.get_alt();
                this.renderContext.targetAz = this.renderContext.az = currentAltAz.get_az();
            }
            if (this.get__mover().get_complete()) {
                globalScriptInterface._fireArrived(this.get__mover().get_currentPosition().get_RA(), this.get__mover().get_currentPosition().get_dec(), globalRenderContext.viewCamera.zoom);
                this.set__mover(null);
                this._notifyMoveComplete();
            }
        }
    } else {
        SpaceTimeController.updateClock();
        Planets.updatePlanetLocations(this.get_solarSystemMode());
        this._updateViewParameters();
    }
    this.renderContext.clear();
    if (this.renderType === 4) {
        if (this._solarSystemTrack < 20) {
            var radius = Planets.getAdjustedPlanetRadius(this._solarSystemTrack);
            var distance = this.renderContext.get_solarSystemCameraDistance();
            var camAngle = this.renderContext.get_fovLocal();
        }
        if (this._trackingObject == null) {
        }
        this.renderContext.setupMatricesSolarSystem(true);
        var zoom = this.renderContext.viewCamera.zoom;
        var milkyWayBlend = Math.min(1, Math.max(0, (Math.log(zoom) - 8.4)) / 4.2);
        var milkyWayBlendIn = Math.min(1, Math.max(0, (Math.log(zoom) - 17.9)) / 2.3);
        var matOldMW = this.renderContext.get_world();
        var matLocalMW = this.renderContext.get_world().clone();
        matLocalMW._multiply(Matrix3d._scaling(100000, 100000, 100000));
        matLocalMW._multiply(Matrix3d._rotationX(23.5 / 180 * Math.PI));
        matLocalMW._multiply(Matrix3d.translation(this.renderContext.cameraPosition));
        this.renderContext.set_world(matLocalMW);
        this.renderContext.set_worldBase(matLocalMW);
        this.renderContext.space = true;
        this.renderContext.makeFrustum();
        var lighting = this.renderContext.lighting;
        this.renderContext.lighting = false;
        if (Settings.get_active().get_solarSystemMilkyWay()) {
            if (milkyWayBlend < 1) {
                if (this._milkyWayBackground == null) {
                    this._milkyWayBackground = this.getImagesetByName('Digitized Sky Survey (Color)');
                }
                if (this._milkyWayBackground != null) {
                    RenderTriangle.cullInside = true;
                    var c = (1 - milkyWayBlend) / 2;
                    this.renderContext.drawImageSet(this._milkyWayBackground, c * 100);
                    RenderTriangle.cullInside = false;
                }
            }
        }
        this._drawSkyOverlays();
        this.renderContext.lighting = lighting;
        this.renderContext.space = false;
        this.renderContext.set_world(matOldMW);
        this.renderContext.set_worldBase(matOldMW);
        this.renderContext.makeFrustum();
        var oldCamera = this.renderContext.cameraPosition;
        var matOld = this.renderContext.get_world();
        var matLocal = this.renderContext.get_world();
        matLocal._multiply(Matrix3d.translation(this.renderContext.viewCamera.viewTarget));
        this.renderContext.cameraPosition = Vector3d.subtractVectors(this.renderContext.cameraPosition, this.renderContext.viewCamera.viewTarget);
        this.renderContext.set_world(matLocal);
        this.renderContext.makeFrustum();
        if (Settings.get_active().get_solarSystemCosmos()) {
            Grids.drawCosmos3D(this.renderContext, 1);
        }
        if (Settings.get_active().get_solarSystemMilkyWay() && milkyWayBlendIn > 0) {
            Grids.drawGalaxyImage(this.renderContext, milkyWayBlendIn);
        }
        if (Settings.get_active().get_solarSystemStars()) {
            Grids.drawStars3D(this.renderContext, 1);
        }
        matLocal = matOld;
        var pnt = this.renderContext.viewCamera.viewTarget;
        var vt = Vector3d.create(-pnt.x, -pnt.y, -pnt.z);
        this.renderContext.cameraPosition = oldCamera;
        matLocal._multiply(Matrix3d.translation(vt));
        this.renderContext.set_world(matLocal);
        this.renderContext.makeFrustum();

        LayerManager._draw(this.renderContext, 1, true, 'Sky', true, false, (layer) => this.shallowLayerTest ? !this.shallowLayerTest(layer) : false);
        this.renderContext.set_world(matOld);
        this.renderContext.makeFrustum();

        if (this.renderContext.get_solarSystemCameraDistance() < 15000) {
            this.renderContext.setupMatricesSolarSystem(false);
            if (Settings.get_active().get_solarSystemMinorPlanets()) {
                MinorPlanets.drawMPC3D(this.renderContext, 1, this.renderContext.viewCamera.viewTarget);
            }
            if (Settings.get_active().get_solarSystemPlanets()) {
                Planets3d.drawPlanets3D(this.renderContext, 1, this.renderContext.viewCamera.viewTarget);
            }
        }

        if (this.shallowLayerTest) {
          LayerManager._draw(this.renderContext, 1, true, 'Sky', true, false, (layer) => this.shallowLayerTest(layer));
          this.renderContext.set_world(matOld);
          this.renderContext.makeFrustum();
        }

    } else {
        // RenderType is not SolarSystem
        if (!this.renderType || this.renderType === 1) {
            this.renderContext._setupMatricesLand3d();
        }
        else {
            this.renderContext.setupMatricesSpace3d(this.renderContext.width, this.renderContext.height);
        }
        this.renderContext.drawImageSet(this.renderContext.get_backgroundImageset(), 100);
        if (this.renderContext.get_foregroundImageset() != null) {
            if (this.renderContext.get_foregroundImageset().get_dataSetType() !== this.renderContext.get_backgroundImageset().get_dataSetType()) {
                this.renderContext.set_foregroundImageset(null);
            }
            else {
                if (this.renderContext.viewCamera.opacity !== 100 && this.renderContext.gl == null) {
                    if (this._foregroundCanvas.width !== this.renderContext.width || this._foregroundCanvas.height !== this.renderContext.height) {
                        this._foregroundCanvas.width = this.renderContext.width;
                        this._foregroundCanvas.height = this.renderContext.height;
                    }
                    var saveDevice = this.renderContext.device;
                    this._fgDevice.clearRect(0, 0, this.renderContext.width, this.renderContext.height);
                    this.renderContext.device = this._fgDevice;
                    this.renderContext.drawImageSet(this.renderContext.get_foregroundImageset(), 100);
                    this.renderContext.device = saveDevice;
                    this.renderContext.device.save();
                    this.renderContext.device.globalAlpha = this.renderContext.viewCamera.opacity / 100;
                    this.renderContext.device.drawImage(this._foregroundCanvas, 0, 0);
                    this.renderContext.device.restore();
                }
                else {
                    this.renderContext.drawImageSet(this.renderContext.get_foregroundImageset(), this.renderContext.viewCamera.opacity);
                }
            }
        }
        if (this.renderType === 2) {
            for (const imageset in this.renderContext.get_catalogHipsImagesets()) {
                if (imageset.get_hipsProperties().get_catalogSpreadSheetLayer().enabled && imageset.get_hipsProperties().get_catalogSpreadSheetLayer().lastVersion === imageset.get_hipsProperties().get_catalogSpreadSheetLayer().get_version()) {
                    this.renderContext.drawImageSet(imageset, 100);
                }
            }
        }
        if (this.renderType === 2 && Settings.get_active().get_showSolarSystem()) {
            Planets.drawPlanets(this.renderContext, 1);
            this.constellation = Constellations.containment.findConstellationForPoint(this.renderContext.viewCamera.get_RA(), this.renderContext.viewCamera.get_dec());
            this._drawSkyOverlays();
        }
        if (this.get_planetLike() || this.get_space()) {
            if (!this.get_space()) {
                var angle = Coordinates.mstFromUTC2(SpaceTimeController.get_now(), 0) / 180 * Math.PI;
                this.renderContext.set_worldBaseNonRotating(Matrix3d.multiplyMatrix(Matrix3d._rotationY(angle), this.renderContext.get_worldBase()));
                if (this._targetBackgroundImageset != null) {
                    this.renderContext.set_nominalRadius(this._targetBackgroundImageset.get_meanRadius());
                }
            }
            else {
                this.renderContext.set_worldBaseNonRotating(this.renderContext.get_world());
                if (this._targetBackgroundImageset != null) {
                    this.renderContext.set_nominalRadius(this._targetBackgroundImageset.get_meanRadius());
                }
            }
            var referenceFrame = this.getCurrentReferenceFrame();
            LayerManager._draw(this.renderContext, 1, this.get_space(), referenceFrame, true, this.get_space());
        }
    }
    var worldSave = this.renderContext.get_world();
    var viewSave = this.renderContext.get_view();
    var projSave = this.renderContext.get_projection();
    if (Settings.get_current().get_showCrosshairs()) {
        this._drawCrosshairs(this.renderContext);
    }
    if (this.uiController != null) {
        this.uiController.render(this.renderContext);
    } else {
        Annotation.prepBatch(this.renderContext);
        for (const item of this._annotations) {
            item.draw(this.renderContext);
        }
        Annotation.drawBatch(this.renderContext);
        if ((Date.now() - this._lastMouseMove) > 400) {
            var ptDown = this.getCoordinatesForScreenPoint(this._hoverTextPoint.x, this._hoverTextPoint.y);
            if (ptDown) {
              this._annotationHover(ptDown.x, ptDown.y, this._hoverTextPoint.x, this._hoverTextPoint.y);
              this._lastMouseMove = new Date(2100, 1, 1);
            }
        }
        if (this._hoverText) {
            this._drawHoverText(this.renderContext);
        }
    }
    var tilesAllLoaded = !TileCache.get_queueCount();
    this.renderContext.setupMatricesOverlays();
    this._fadeFrame();
    this._frameCount++;
    TileCache.decimateQueue();
    TileCache.processQueue(this.renderContext);
    Tile.currentRenderGeneration++;
    if (!TourPlayer.get_playing()) {
        this.set_crossFadeFrame(false);
    }

    // Restore Matrices for Finder Scope and such to map points
    this.renderContext.set_world(worldSave);
    this.renderContext.set_view(viewSave);
    this.renderContext.set_projection(projSave);
    const now = Date.now();
    var ms = now - this._lastUpdate;
    if (ms > 1000) {
        this._lastUpdate = now;
        this._frameCount = 0;
        RenderTriangle.trianglesRendered = 0;
        RenderTriangle.trianglesCulled = 0;
    }
    if (this.capturingVideo) {
        if ((this.dumpFrameParams != null) && (!this.dumpFrameParams.waitDownload || tilesAllLoaded)) {
            this.captureFrameForVideo(this._videoBlobReady, this.dumpFrameParams.width, this.dumpFrameParams.height, this.dumpFrameParams.format);
            SpaceTimeController.nextFrame();
        }
        if (SpaceTimeController.get_doneDumping()) {
            SpaceTimeController.frameDumping = false;
            SpaceTimeController.cancelFrameDump = false;
            this.capturingVideo = false;
        }
    }
}

export function makeFrustum() {
    this.WV = Matrix3d.multiplyMatrix(this.get_world(), this.get_view());
    var viewProjection = Matrix3d.multiplyMatrix(this.WV, this.get_projection());
    this.WVP = viewProjection.clone();
    var inverseWorld = this.get_world().clone();
    inverseWorld.invert();

    // Left plane
    this._frustum[0].a = viewProjection.get_m14() + viewProjection.get_m11();
    this._frustum[0].b = viewProjection.get_m24() + viewProjection.get_m21();
    this._frustum[0].c = viewProjection.get_m34() + viewProjection.get_m31();
    this._frustum[0].d = viewProjection.get_m44() + viewProjection.get_m41();

    // Right plane
    this._frustum[1].a = viewProjection.get_m14() - viewProjection.get_m11();
    this._frustum[1].b = viewProjection.get_m24() - viewProjection.get_m21();
    this._frustum[1].c = viewProjection.get_m34() - viewProjection.get_m31();
    this._frustum[1].d = viewProjection.get_m44() - viewProjection.get_m41();

    // Top plane
    this._frustum[2].a = viewProjection.get_m14() - viewProjection.get_m12();
    this._frustum[2].b = viewProjection.get_m24() - viewProjection.get_m22();
    this._frustum[2].c = viewProjection.get_m34() - viewProjection.get_m32();
    this._frustum[2].d = viewProjection.get_m44() - viewProjection.get_m42();

    // Bottom plane
    this._frustum[3].a = viewProjection.get_m14() + viewProjection.get_m12();
    this._frustum[3].b = viewProjection.get_m24() + viewProjection.get_m22();
    this._frustum[3].c = viewProjection.get_m34() + viewProjection.get_m32();
    this._frustum[3].d = viewProjection.get_m44() + viewProjection.get_m42();

    // Near plane
    this._frustum[4].a = viewProjection.get_m13();
    this._frustum[4].b = viewProjection.get_m23();
    this._frustum[4].c = viewProjection.get_m33();
    this._frustum[4].d = viewProjection.get_m43();
    if (this.get_backgroundImageset().get_dataSetType() <2 || this.get_backgroundImageset().get_dataSetType() == 4) {
      this._frustum[4].a += viewProjection.get_m14();
      this._frustum[4].b += viewProjection.get_m24();
      this._frustum[4].c += viewProjection.get_m34();
      this._frustum[4].d += viewProjection.get_m44();
    }

    // Far plane
    this._frustum[5].a = viewProjection.get_m14() - viewProjection.get_m13();
    this._frustum[5].b = viewProjection.get_m24() - viewProjection.get_m23();
    this._frustum[5].c = viewProjection.get_m34() - viewProjection.get_m33();
    this._frustum[5].d = viewProjection.get_m44() - viewProjection.get_m43();

    // Normalize planes
    for (var i = 0; i < 6; i++) {
        this._frustum[i].normalize();
    }
    this._frustumDirty = false;
    this.WVP.scale(Vector3d.create(this.width / 2, -this.height / 2, 1));
    this.WVP.translate(Vector3d.create(this.width / 2, this.height / 2, 0));
    this._setMatrixes();
}

// TODO: This doesn't work
// export function getTableDataInView() {
//     var data = '';
//     var first = true;
//     for (const col of this.get_header()) {
//         if (!first) {
//             data += '\t';
//         }
//         else {
//             first = false;
//         }
//         data += col;
//     }
//     data += '\r\n';
//     const planetMode = WWTControl.singleton.renderContext.get_backgroundImageset().get_dataSetType() < 2;
//     for (const row of this.get__table().rows) {
//         var x = parseFloat(row[this.get_xAxisColumn()]);
//         var y = parseFloat(row[this.get_yAxisColumn()]);
//         var z = parseFloat(row[this.get_zAxisColumn()]);
//         var position = Vector3d.create(x, y, z);
//         if (!this._isPointInFrustum$1(position, WWTControl.singleton.renderContext.get_frustum())) {
//             continue;
//         }
//         first = true;
//         for (const col of row) {
//             if (!first) {
//                 data += '\t';
//             }
//             else {
//                 first = false;
//             }
//             data += col;
//         }
//         data += '\r\n';
//     }
//     return data;
// }

export function layerManagerDraw(renderContext, opacity, astronomical, referenceFrame, nested, cosmos, filter=null) {
    if (!(referenceFrame in LayerManager.get_allMaps())) {
        return;
    }
    var thisMap = LayerManager.get_allMaps()[referenceFrame];
    if (!thisMap.enabled || (thisMap.childMaps && !thisMap.layers.length && !(thisMap.frame.showAsPoint || thisMap.frame.showOrbitPath))) {
        return;
    }
    var matOld = renderContext.get_world();
    var matOldNonRotating = renderContext.get_worldBaseNonRotating();
    var oldNominalRadius = renderContext.get_nominalRadius();
    if ((thisMap.frame.reference === 18 || thisMap.frame.reference === 18) === 1) {
        thisMap.computeFrame(renderContext);
        if (thisMap.frame.referenceFrameType !== 1 && thisMap.frame.referenceFrameType !== 2) {
            renderContext.set_world(Matrix3d.multiplyMatrix(thisMap.frame.worldMatrix, renderContext.get_world()));
        } else {
            renderContext.set_world(Matrix3d.multiplyMatrix(thisMap.frame.worldMatrix, renderContext.get_worldBaseNonRotating()));
        }
        renderContext.set_nominalRadius(thisMap.frame.meanRadius);
    }
    if (thisMap.frame.showAsPoint) {
        // todo Draw point planet...
        // Planets.DrawPointPlanet(renderContext.Device, new Vector3d(0, 0, 0), (float).2, thisMap.Frame.RepresentativeColor, true);
    }
    for (var pass = 0; pass < 2; pass++) {
        for (const layer of LayerManager.get_allMaps()[referenceFrame].layers) {
            if ((!pass && (layer instanceof ImageSetLayer)) || (pass === 1 && !(layer instanceof ImageSetLayer))) {
                var skipLayer = false;
                if (!pass) {
                    // Skip default image set layer so that it's not drawn twice
                    skipLayer = !astronomical && (layer).get_overrideDefaultLayer();
                }
                if (layer.enabled && !skipLayer) {
                    var layerStart = SpaceTimeController.utcToJulian(layer.get_startTime());
                    var layerEnd = SpaceTimeController.utcToJulian(layer.get_endTime());
                    var fadeIn = SpaceTimeController.utcToJulian(layer.get_startTime()) - ((layer.get_fadeType() === 1 || layer.get_fadeType() === 3) ? (layer.get_fadeSpan() / 864000000) : 0);
                    var fadeOut = SpaceTimeController.utcToJulian(layer.get_endTime()) + ((layer.get_fadeType() === 2 || layer.get_fadeType() === 3) ? (layer.get_fadeSpan() / 864000000) : 0);
                    if (SpaceTimeController.get_jNow() > fadeIn && SpaceTimeController.get_jNow() < fadeOut) {
                        var fadeOpacity = 1;
                        if (SpaceTimeController.get_jNow() < layerStart) {
                            fadeOpacity = ((SpaceTimeController.get_jNow() - fadeIn) / (layer.get_fadeSpan() / 864000000));
                        }
                        if (SpaceTimeController.get_jNow() > layerEnd) {
                            fadeOpacity = ((fadeOut - SpaceTimeController.get_jNow()) / (layer.get_fadeSpan() / 864000000));
                        }
                        if (filter && filter(layer)) {
                            layer.set_astronomical(astronomical);
                            layer.draw(renderContext, opacity * fadeOpacity, cosmos);
                        }
                    }
                }
            }
        }
    }
    renderContext.set_nominalRadius(oldNominalRadius);
    renderContext.set_world(matOld);
    renderContext.set_worldBaseNonRotating(matOldNonRotating);
};
