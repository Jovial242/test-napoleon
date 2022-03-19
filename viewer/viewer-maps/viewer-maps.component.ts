import { MapCollider } from './../../../providers/maps/MapCollider';
import { BehaviorSubject, Observable } from 'rxjs';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { MatDialog } from '@angular/material/dialog';
import { Queue } from 'src/app/interfaces/queue';
import { AuthService } from 'src/app/services/auth.service';
import { ModelsService } from 'src/app/services/models.service';
import { UnitsService } from 'src/app/services/units.service';
import { UsersService } from 'src/app/services/users.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ZonesService } from 'src/app/services/zones.service';
import { TrackersService } from 'src/app/services/trackers.service';
// import * as THREE from 'three';
import { OriginModalComponent } from '../origin-modal/origin-modal.component';
import { TracesModalComponent } from '../traces-modal/traces-modal.component';
import { ZonesModalComponent } from '../zones-modal/zones-modal.component';
import { AttachmentsService } from 'src/app/services/attachments.service';
import * as Tools from 'src/app/providers/3DTools';
import * as moment from 'moment';

@Component({
  selector: 'app-viewer-maps',
  templateUrl: './viewer-maps.component.html',
  styleUrls: ['./viewer-maps.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ViewerMapsComponent implements OnInit {
  @ViewChild(GoogleMap) map!: GoogleMap;
  title = 'google-maps';
  user: any;
  mapObject: any;
  projectXY = [0, 0];
  mapAngle: any;
  userLastPosition: any;
  viewerPositions = [];
  projectId: any;
  mapOptions: any;
  markerPosition: any;
  showMap = true;
  polygonZones = [];
  zones: any[] = [];
  minUnitScale = 1;
  colors: any = {
    worker: '#0066FF',
    crane: '#FFA500',
    equipment: '#FF3300',
    event: '#EEBB39',
    warning: '#FF6600',
    danger: '#DD4B39',
    primary: '#00A65A',
    success: '#3C8DBC',
    lemon: '#F3E612',
    teal: '#39CCCC',
    fuchsia: '#F012BE',
    dark: '#010101',
    info: '#666666',
    mute: '#808080',
    white: '#FFFFFF',
    black: '#000000',
    default: '#99BBAA'
  };
  units: any[] = [];
  markers: any = {};
  altitude = 0;
  trackerObservableArray = [];
  createZone = false;
  drawingZone = null;
  modelData: any;
  groundOverlay: any;
  socketUnitAttached = false;
  socketUnitSub: any;
  socketSub: any;
  socketAttached = false;
  processing = false;
  queue: any = new Queue();
  statusColor = 'success';
  loadedTraces: any[] = [];
  loadedMarkers: any[] = [];
  trackers: any[] = [];
  pAttachments: any[] = [];
  lastAttachment: any;
  lastPredictions: any[] = [];
  showLastAttachment = false;
  predictionTrackers: any[] = [];
  sAttachments: any[] = [];

  playMode: string = 'realtime';
  playerValueSbj: BehaviorSubject<number>;
  playerValue: Observable<any>;

  icons: any;

  constructor(private auth: AuthService, private modelsService: ModelsService, private zonesService: ZonesService,
    private unitsService: UnitsService, private dialog: MatDialog, private usersService: UsersService,
    private socket: WebSocketService, private trackersService: TrackersService,
    private attachmentsService: AttachmentsService) {
    this.auth.requestRecentUserData().subscribe(async (res: any) => {
      this.user = res;
      this.projectId = this.user.currentProject.id;
      this.viewerPositions = this.user.viewerPositions;
      this.getModel(this.user.currentProject.model)
    })

    this.playerValueSbj = new BehaviorSubject<number>(0);
    this.playerValue = this.playerValueSbj.asObservable();
  }

  ngOnInit(): void {
    this.getListTracks();
    this.getListTrackers();
    this.getListAttachments();
  }

  getModel(modelId) {

    this.modelsService.getModel(modelId).subscribe(async results => {
      try {
        this.modelData = results;
        this.mapAngle = results.origin.gMapsAngle;
        let object = {
          mapCoord: results.mapCoord,
          origin: results.origin,
          mapImage: results.mapImage
        };

        this.userLastPosition = this.viewerPositions.filter(t => t.projectId == this.projectId);

        this.mapObject = object;
        this.projectXY = Tools.getXYFromLatLonAlt(object.origin.position.lat, object.origin.position.lon, 0)
        await this.loadMap(this.mapObject);
      } catch (e) {
        console.error(e)
      }

    }, error => {
      this.showMap = false;
      console.error(error)
    });
  }

  getCollider(options) {
    try {
      if (options.unit.collider.geometry == null) return

      let collider = new MapCollider(options)
      collider.init();
      collider.addToMap(this.map);

      return collider;

    } catch (e) {
      console.error(e)
    }

  }


  loadMap(object) {
    let mapOptions: google.maps.MapOptions = {
      center: this.userLastPosition.length != 0 ? { lat: this.userLastPosition[0].lat, lng: this.userLastPosition[0].lon } : { lat: object.origin.position.lat, lng: object.origin.position.lon },
      zoom: this.userLastPosition.length != 0 ? this.userLastPosition[0].zoom : 15,
      tilt: this.userLastPosition.length != 0 ? this.userLastPosition[0].tilt : 0,
      mapTypeId: google.maps.MapTypeId.SATELLITE
    }
    this.mapOptions = mapOptions;

    new google.maps.Marker({
      position: { lat: object.origin.position.lat, lng: object.origin.position.lon },
      map: this.map.googleMap,
    });

    if (this.groundOverlay) this.groundOverlay.setMap(null);
    this.groundOverlay = new google.maps.GroundOverlay(object.mapImage, object.mapCoord)
    this.groundOverlay.setMap(this.map.googleMap);

    this.map.mapDblclick.subscribe((data) => {

      const streetView = this.map.getStreetView();
      streetView.setOptions({
        position: { lat: data.latLng.lat(), lng: data.latLng.lng() },
        pov: { heading: 70, pitch: -10 },
      });
      streetView.setVisible(true);
    })

    this.map.googleMap.setOptions({ zoomControl: object.origin.zoomEnabled, gestureHandling: object.origin.panEnabled ? 'greedy' : 'none' });
    this.getListUnits()

    if (this.map)
      this.getListZones();

    this.map.mapDragend.subscribe(() => {
      let viewerPositions = {
        lat: this.map.googleMap.getCenter().lat(),
        lon: this.map.googleMap.getCenter().lng(),
        tilt: this.map.googleMap.getTilt(),
        zoom: this.map.googleMap.getZoom(),
        projectId: this.user.currentProject.id
      }
      this.updateUserLastPosition(viewerPositions)
    })
  }

  getListZones() {
    this.zonesService.getZones().subscribe((zones) => {
      this.zones = zones;

      if (zones.length != 0) {
        zones.forEach((t) => {
          if (t.visible && t.polygon.length != 0) {
            this.initializeShowingZone(t)
          }
        })
      }
    }, error => console.error(error))
  }

  async initializeShowingZone(zone) {
    try {

      let positions = [];
      let latLon = []
      zone.polygon.forEach(t => {
        latLon = Tools.getLatLonFromXYZ(this.projectXY[0] + t[0], this.projectXY[1] + t[1], 0)
        positions.push({ lat: latLon[1], lng: latLon[0] })
      })

      const zoneColor = this.convertColors(zone.color);

      let _zone = new google.maps.Polygon({
        paths: positions,
        strokeColor: 'red',
        fillColor: zoneColor,
        strokeWeight: 2,
        fillOpacity: 0.45
      });

      this.polygonZones.push(_zone);
      _zone.setMap(this.map.googleMap)

    } catch (e) {
      console.error(e)
    }
  }

  convertColors(color) {

    let array = [
      { title: 'primary', value: '#87CEEB' },
      { title: 'danger', value: '#bb2124' },
      { title: 'success', value: "#22bb33" },
      { title: 'warning', value: "#f0ad4e" },
      { title: 'info', value: "#5bc0de" }
    ]

    array.forEach(t => {
      if (color === t.title) color = t.value;
    })

    return color
  }

  getListUnits() {
    this.unitsService.getUnits().subscribe((units: any) => {
      this.units = units;
      if (this.map) {
        this.initTrackers()
      }
    }, err => console.error(err))
  }

  loadIcons() {
    return new Promise((resolve, reject) => {

      try {
        var icons = ['antenna', 'danger', 'drone', 'formwork', 'hook', 'wheel', 'worker', 'arrow'];

        var loadCount = 0;
        if (!this.icons) {
          this.icons = {};
          icons.forEach((icon) => {

            let xhr, url;
            url = `/assets/models/${icon}.svg`;

            xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = async () => {
              this.icons[icon] = xhr.responseText;
              loadCount++;
              if (loadCount == icons.length) resolve(true)
            }
            xhr.send(null);
          })

        } else {
          resolve(true)
        }

      } catch (e) {
        console.error(e)
      }
    })
  }

  async initTrackers() {
    try {
      await this.loadIcons();
      for (let i = 0; i < this.units.length; i++) {
        let unit = this.units[i];
        if (unit.trackers[0] == undefined) continue;

        let trackerId = unit.trackers[0].id || unit.trackers[0];
        let unitId = unit.id;
        // let trackerName = unit.trackers[0].name;
        let filterTrackerName = this.trackers.filter(t => t.id == unit.trackers[0] || t.id == unit.trackers[0].id);

        if (!filterTrackerName.length) continue;
        let trackerName = filterTrackerName[0].name;

        let picture = unit.picture;
        let unitIcon = unit.icon.split(".")[0] || 'arrow';
        let traceColor = unit.color || 'default';
        let traceAlpha = unit.alpha || 0.5;
        let size = 50 * this.minUnitScale;

        let icon = {
          url: ''
        }

        let template, svg, color, xhr;

        if (this.colors[traceColor]) color = this.colors[traceColor];
        else color = traceColor;

        svg = this.icons[unitIcon].replace('{{ color }}', color).replace('{{ triangleColor }}', color);

        var regSize = new RegExp('{{ size }}', 'g');
        svg = svg.replace(regSize, size);
        var regScale = new RegExp('{{ scale }}', 'g');
        svg = svg.replace(regScale, this.minUnitScale);

        icon.url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

        let url: any = await this.loadImageAsPNG(icon.url, 40, 40)

        let textColor = traceColor || '#FFFFFF';

        let track = {
          lat: 0,
          lon: 0,
          x: 0,
          y: 0,
          z: 0
        }

        if (unit.lastPosition) {
          track = unit.lastPosition;
        } else if (unit.trackers[0].lastTracks && unit.trackers[0].lastTracks.length) {
          track = unit.trackers[0].lastTracks[unit.trackers[0].lastTracks.length - 1]
        }

        if ((!track.lat && !track.lon) && (track.x && track.y)) {
          let lonLat = Tools.getLatLonFromXYZ(this.projectXY[0] + track.x, this.projectXY[1] + track.y, this.altitude);

          track.lon = lonLat[1];
          track.lat = lonLat[0];
        }

        if (this.markers[trackerId]) {
          if (this.markers[trackerId].collider && this.markers[trackerId].collider.mapPolygon) {
            this.markers[trackerId].collider.unit = unit
            this.markers[trackerId].collider.init();
          }
          if (this.markers[trackerId].marker) {
            this.markers[trackerId].marker.setIcon({ url })
            this.markers[trackerId].marker.setPosition(new google.maps.LatLng(track.lat, track.lon))
          }

          this.markers[trackerId].unit = unit;
          this.markers[trackerId].color = traceColor;
          this.markers[trackerId].alpha = traceAlpha;
          this.markers[trackerId].lastTrack = track;

        } else {

          let marker = new google.maps.Marker({
            title: unit.name,
            label: {
              text: unit.name,
              color: 'white'
            },
            position: new google.maps.LatLng(track.lat, track.lon),
            icon: url,
            map: this.map.googleMap
          });

          // let collider = await this.initCollider(unit);

          let collider = null;
          if (unit.collider) {
            let options = {
              unit: unit,
              XYOrigin: this.projectXY,
            }

            collider = this.getCollider(options);
          }

          this.markers[trackerId] = {
            marker,
            name: trackerName,
            color: traceColor,
            alpha: traceAlpha,
            collider,
            unit: unit,
            lastTrack: track
          };

          this.trackerObservableArray.push({
            id: trackerId,
            unitId,
            name: trackerName,
            show: true,
            trace: false,
            showCollider: true,
            color: traceColor,
            alpha: traceAlpha
          });

          const t = {
            id: trackerId,
            unitId,
            name: trackerName,
            show: true,
            trace: false,
            showCollider: true,
            color: traceColor,
            alpha: traceAlpha
          }

          // if (trackerName.toLowerCase().slice(0, 6) == 'worker') 
          this.loadedMarkers.push({ tracker: t, marker })

        }


      }
    } catch (err) {
      console.error(err);
    }
  }

  loadImageAsPNG(url, height, width) {
    return new Promise((resolve, reject) => {
      let sourceImage = new Image();

      sourceImage.onload = () => {
        let png = new Image();
        let cnv = document.createElement('canvas'); // doesn't actually create an element until it's appended to a parent, 
        // so will be discarded once this function has done it's job
        cnv.height = height;
        cnv.width = width;

        let ctx = cnv.getContext('2d');

        ctx.drawImage(sourceImage, 0, 0, height, width);
        png.src = cnv.toDataURL(); // defaults to image/png
        //resolve(png)
        resolve(png.src);
      }
      sourceImage.onerror = reject;

      sourceImage.src = url;
    });
  }

  zoneModal() {
    const modal = this.dialog.open(ZonesModalComponent, {
      data: { zones: this.zones },
      width: '850px',
      restoreFocus: false
    })

    const sub = modal.componentInstance.onAdd.subscribe((results) => {
      this.zones = results.zones;
      this.polygonZones.forEach(t => {
        const path = t.getPaths();
        path.pop()
      });

      this.polygonZones = [];
      results.zones.forEach(t => {
        if (t.visible && t.polygon.length != 0) {
          this.initializeShowingZone(t)
        }
      })
    });
    modal.afterClosed().subscribe((res) => {

      if (sub) sub.unsubscribe();

      this.createZone = res.createZone;
      if (this.createZone) this.initializeZone()
    })
  }

  centerBtn() {
    let mapOptions: google.maps.MapOptions = {
      center: { lat: this.mapObject.origin.position.lat, lng: this.mapObject.origin.position.lon },
      zoom: this.mapObject.origin.zoom ? this.mapObject.origin.zoom : 15,
      tilt: this.mapObject.origin.tilt ? this.mapObject.origin.tilt : 0,
      mapTypeId: google.maps.MapTypeId.SATELLITE
    }

    this.map.googleMap.setOptions(mapOptions)
    this.usersService.updateLastPosition({ lat: mapOptions.center.lat, lon: mapOptions.center.lng, zoom: mapOptions.zoom, tilt: 0, projectId: this.projectId }, this.viewerPositions)
  }

  initializeZone() {
    let drawingZone = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON
        ]
      },
      polygonOptions: {
        editable: true
      }
    });

    drawingZone.setMap(this.map.googleMap);

    drawingZone.addListener('overlaycomplete', (event) => {
      event.overlay.setOptions({
        strokeColor: "#FF0000",
        fillColor: "#5bc0de",
        fillOpacity: 0.35,
        strokeOpacity: 0.8,
        strokeWidth: 1
      });

      event.overlay.set('editable', false);
      drawingZone.setMap(null);

      let path = event.overlay.getPath();

      let polygon = [];
      let _polygon = [];

      for (let i = 0; i < path.length; i++) {
        const point = Tools.getXYFromLatLonAlt(path.getAt(i).lat(), path.getAt(i).lng(), 0);
        point[0] = point[0];
        point[1] = point[1];
        polygon.push(point);
        _polygon.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() })
      }

      let zone = {
        polygon,
        name: "Untitled",
        color: 'primary',
        type: event.type,
        visibility: true
      };

      this.zonesService.addZone(zone).subscribe(res => {

        this.zones.push(res);
        let _zone = new google.maps.Polygon({
          paths: _polygon,
          strokeColor: 'red',
          fillColor: '#5bc0de',
          strokeWeight: 2,
          fillOpacity: 0.45
        });

        _zone.setMap(this.map.googleMap)
        this.polygonZones.push(_zone);
        event.overlay.setOptions(null);

        const p = event.overlay.getPaths();
        p.pop()
      }, err => console.error(err))
    })
  }

  traceUnitModal() {
    const modal = this.dialog.open(TracesModalComponent, {
      data: { trackers: this.trackerObservableArray },
      width: '800px',
      height: this.trackerObservableArray.length > 10 ? '700px' : 'auto'
    })

    const sub = modal.componentInstance.onAdd.subscribe((updatedTrackers: any) => {
      this.trackerObservableArray = updatedTrackers.trackers;
      let val: any = Object.values(updatedTrackers)[1];
      this.trackerObservableArray.forEach(t => {
        this.loadedMarkers.forEach(m => {
          if (t.id == m.tracker.id) m.tracker.show = t.show
        })
      })

      if (updatedTrackers) {
        if (val == 'trace') {
          this.loadedTraces.forEach((t: any) => {
            if (t && !t.tracker[val]) {
              t[val].getPath().clear()
              t[val].setMap(null)
            }
          })
        } else if (val == 'show') {
          this.loadedMarkers.forEach(t => {
            if (t && !t.tracker[val]) {
              t.marker.setMap(null);
            } else if (t && t.tracker[val]) {
              t.marker.setMap(this.map.googleMap)
            }
          })
        }
      }
    });

    modal.afterClosed().subscribe(() => {
      if (sub) sub.unsubscribe();
    })
  }

  originModal() {
    const origin = this.dialog.open(OriginModalComponent, {
      // width: '810px',
      // height: '700px',
      data: { modelData: this.modelData, projectId: this.user.currentProject.model }
    })

    const sub = origin.componentInstance.onAdd.subscribe(results => {

      this.mapObject = results.currentModel;
      this.modelData = this.mapObject
      this.mapAngle = results.currentModel.origin.gMapsAngle;

      this.userLastPosition = [{
        zoom: this.mapObject.origin.zoom,
        lat: this.mapObject.origin.position.lat,
        lon: this.mapObject.origin.position.lon,
        tilt: this.mapObject.origin.angle,
        projectId: this.projectId
      }]

      this.loadMap(this.mapObject);
      this.updateUserLastPosition(this.userLastPosition[0])
    })

    origin.afterClosed().subscribe(() => {
      if (sub) sub.unsubscribe();
    })
  }

  async updateUserLastPosition(viewerPositions) {
    try {
      let lastPosition = [];
      this.usersService.getUser(this.user.id).subscribe((data: any) => {
        lastPosition = data.viewerPositions;
        const lastPositionIndex = lastPosition.findIndex(t => t.projectId == viewerPositions.projectId);
        if (lastPositionIndex > -1) lastPosition.splice(lastPositionIndex, 1);
        lastPosition.push(viewerPositions);
        this.usersService.updateLastPosition(viewerPositions, this.viewerPositions)
      })

    } catch (error) {
      console.error(error)
    }
  }

  getListTracks() {
    this.socket.getTracks().then(socket => {
      if (!this.socketAttached) {
        this.socketSub = socket.subscribe(async data => {
          try {

            if (data.length === 0 || this.playMode !== 'realtime') {
              return;
            }

            for (let i = 0; i < data.length; i++) {

              if (!data[i].tracker) return
              let trackerId = data[i].tracker.id || data[i].tracker;

              if (data[i].message.connexionStatus) {
                let cs = data[i].message.connexionStatus;
                if (cs == 'good') this.statusColor = 'success'
                else if (cs == 'average') this.statusColor = 'warning'
                else this.statusColor = 'danger'
              }

              if (!this.queue.findBy("trackerId", trackerId))
                this.queue.enqueue({ trackerId, track: data[i] });
            }

            if (!this.processing) {
              this.processQueue();
            }

          } catch (e) {
            console.error(e)
          }
        })
      }
      this.socketAttached = true;
    })

    this.socket.getUnits().then(socket => {

      if (!this.socketUnitAttached) {
        this.socketUnitSub = socket.subscribe(async units => {
          try {

            if (units.length === 0) {
              return;
            }
            units.forEach(unit => {
              let oldUnit = this.units.findIndex(u => u.id == unit.id);

              if (oldUnit >= 0) this.units[oldUnit] = unit;
              else {
                this.units.push(unit);
              }
            })
            this.initTrackers()

          } catch (e) {
            console.error(e)
          }
        })
      }
      this.socketUnitAttached = true;
    })
  }

  async processQueue() {
    this.processing = true;

    while (!this.queue.isEmpty()) {
      let next = this.queue.next();

      this.queue.dequeue();
      await this.updateMapTrack(next.track);
    }
    this.processing = false;
  }

  async updateMapTrack(track) {
    try {
      
      if (!track.tracker) return
      const trackerId = track.tracker.id || track.tracker;
      const trackerName = track.tracker.name || track.tracker;

      if ((!track.lat && !track.lon) && (track.x !== undefined && track.y !== undefined)) {
        let vec3 = new THREE.Vector3(track.x, track.y, 0);

        if (this.mapAngle) {
          var radians = this.mapAngle * (Math.PI / 180);
          vec3.applyAxisAngle(new THREE.Vector3(0, 0, 1), radians);
        }

        let lonLat = Tools.getLatLonFromXYZ(this.projectXY[0] + vec3.x, this.projectXY[1] + vec3.y, this.altitude);

        track.lon = lonLat[0];
        track.lat = lonLat[1];
      }
      if (!this.markers[trackerId]) return;

      let {
        marker,
        color,
        trace,
        unit,
        collider,
        lastTrack
      } = this.markers[trackerId];

      this.markers[trackerId].lastTrack = track;
      if (track.lat == lastTrack.lat && track.lon == lastTrack.lon) {
        return;
      }

      if (!marker) return;

      let latlon = new google.maps.LatLng(track.lat, track.lon);
      let pos = new google.maps.LatLng(track.lat, track.lon);

      marker.setPosition(latlon);

      if (!trace) {
        trace = new google.maps.Polyline({
          path: [pos],
          strokeColor: color || '#000000',
          strokeWeight: 2,
          geodesic: true,
          strokeOpacity: 0.8
        });
        trace.setMap(this.map.googleMap);
      }

      let path = trace.getPath();
      let index = this.trackerObservableArray.findIndex(x => x.id == trackerId);
      this.loadedTraces.push({ trace, tracker: this.trackerObservableArray[index], marker: this.markers[trackerId].marker });

      if (index >= 0 && this.trackerObservableArray[index].trace === true) {
        if (trace.map == null) {
          trace.setMap(this.map.googleMap);
        } else {
          path.push(pos)
        }
      } else {
        path.pop();
      }
      
      if (this.trackerObservableArray[index].showCollider === true && collider) {

        let child = null;
        let parent = this.getParentUnit(trackerId);

        if (unit.collider.geometry == "Crane" && (unit.crane.jibTracker || unit.crane.hookTracker)) {
          child = this.markers[unit.crane.jibTracker || unit.crane.hookTracker];
        }

        if (child) {
          collider.updateLatLonRotation(track, child.lastTrack)
        } else {
          collider.updateLatLonPosition(track)
        }

        if (parent) {
          parent.collider.updateLatLonRotation(parent.lastTrack, track)
        }
      }

      this.markers[trackerId].trace = trace; // Update trace
      return "ok";
    } catch (err) {
      console.error(err);
    }
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getParentUnit(trackerId) {
    let parent;
    Object.keys(this.markers).forEach(k => {

      let t = this.markers[k];

      if (t.unit && t.unit.collider && t.unit.collider.geometry == "Crane" && (t.unit.crane.jibTracker == trackerId || t.unit.crane.hookTracker == trackerId)) {
        parent = t;
      }
    })

    return parent;
  }


  getListTrackers() {
    this.trackersService.getTrackers().subscribe(trackers => this.trackers = trackers)
  }

  getListAttachments() {
    this.attachmentsService.getAttachments().subscribe((attachments: any) => {
      if (attachments && attachments.length) {
        // this.pAttachments = attachments.filter(t => t.predictions.length != 0) << non necessaire
        this.pAttachments = this.removeDuplicates(attachments, "tracker");// Removal of duplicates in the select viewv

        this.lastAttachment = this.pAttachments[this.pAttachments.length - 1];
        this.lastPredictions = this.lastAttachment.predictions;
        this.lastPredictions.forEach((t: any) => t.probability = t.probability.toFixed(2) * 100);
        this.pAttachments.forEach(p => {
          this.trackers.forEach(t => {
            if (p.tracker == t.id) p.trackerName = t.name;
          })
          if (!p.trackerName) p.trackerName = "N/A";
        })
      }
    })

  }

  removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }

  loadPredictions(trackerId) {
    const n = this.pAttachments.filter(p => p.tracker == trackerId);
    this.lastAttachment = n[n.length - 1];
    this.lastPredictions = this.lastAttachment.predictions;
  }

  cameraBtn() {
    if (this.showLastAttachment) this.showLastAttachment = false
    else this.showLastAttachment = true;
  }

  onPlayerChanged(data) {
    this.playMode = data.playMode;
    if (this.playMode == 'realtime' || data.playerState !== 'play') {
      return;
    }

    var ids = this.units.map((unit) => {
      if (unit.trackers && unit.trackers.length) return unit.trackers[0].id
    });

    // var ids = Object.keys(self.units);
    var payload = {
      trackers: ids,
      createdDate: moment(data.playerDate).toISOString()
    };
    
    this.trackersService.getPositionOfTracksAtTime(payload).subscribe((tracks: any) => {
      // update tracker position
      tracks.forEach(async t => {
        this.updateMapTrack(t);
      })
      if (data.playAllMode)
        this.playerValueSbj.next(data.playerValue + data.speed);
      // this.viewer.impl.invalidate(true, true, true);
      // this.viewer.impl.sceneUpdated(true);

    }, (err) => {
      console.error(err);
    });
  }
}
