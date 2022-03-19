import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Trackers } from './../../../providers/forge/units/Trackers';
import { Units } from './../../../providers/forge/units/Units';
import * as ForgeTools from 'src/app/providers/3DTools';
import { WebSocketService } from './../../../services/web-socket.service';
import { TrackersService } from './../../../services/trackers.service';
import { UnitsService } from './../../../services/units.service';
import { TranslateService } from '@ngx-translate/core';
import { ZonesService } from 'src/app/services/zones.service';
import { ZoneExtension } from './../../../providers/forge/zones/extension';
import { UnitExtension } from './../../../providers/forge/units/extension';
import { AuthService } from 'src/app/services/auth.service';
import { UsersService } from 'src/app/services/users.service';
import { ProjectsService } from './../../../services/projects.service';
import { ModelsService } from './../../../services/models.service';
import { Component, OnInit } from '@angular/core';

import {
  ViewerOptions,
  ViewerInitializedEvent,
  DocumentChangedEvent,
  SelectionChangedEventArgs,
  ViewerComponent,
  Extension
} from "ng2-adsk-forge-viewer";
import { OriginExtension } from 'src/app/providers/forge/origin/extension';
import * as moment from 'moment';

class Model {
  id: string = "xxx";
  origin: any = {};
  scale: number = 1;
  offset: any = { x: 0, y: 0, z: 0 };
  projectXY: any[] = [0, 0];
  urn: string = "_";
  minUnitScale: number = 1;
  constructor(opt) {
    Object.keys(opt).forEach(k => {
      if (this[k]) this[k] = opt[k]
    })
  }
}

class player {

}

@Component({
  selector: 'app-viewer-forge',
  templateUrl: './viewer-forge.component.html',
  styleUrls: ['./viewer-forge.component.scss']
})
export class ViewerForgeComponent implements OnInit {
  public viewerOptions: ViewerOptions;
  public documentId: string;
  public viewer: any;
  originExt: OriginExtension;
  zoneExt: ZoneExtension;
  unitExt: UnitExtension;
  model: Model;
  units: Units = { array: [] };
  trackers: Trackers = { array: [] };
  project: any;
  user: any;
  socketTrackSub: any;
  socketUnitSub: any;
  playMode: string = 'realtime';
  playerValueSbj: BehaviorSubject<number>;
  playerValue: Observable<any>;

  constructor(
    private auth: AuthService,
    private modelsService: ModelsService,
    private zonesService: ZonesService,
    private unitsService: UnitsService,
    private trackersService: TrackersService,
    private socket: WebSocketService,
    private translate: TranslateService) {


    this.playerValueSbj = new BehaviorSubject<number>(0);
    this.playerValue = this.playerValueSbj.asObservable();
    this.user = this.auth.currentUserValue;

    // this.modelsService.getModel()
    this.modelsService.getCurrentModel(this.user.currentProject.id).subscribe(res => {
      this.model = new Model({ ...res });

      if (this.model.origin.position.lat && this.model.origin.position.lon) {
        this.model.origin.projectLatLonXY = ForgeTools.getXYFromLatLonAlt(this.model.origin.position.lat, this.model.origin.position.lon, 0);
      }
      if (this.model.origin.position.x != undefined && this.model.origin.position.y != undefined) {
        this.model.origin.projectXY = [parseFloat(this.model.origin.position.x), parseFloat(this.model.origin.position.y)];
      } else {
        this.model.origin.projectXY = [0, 0]
      }
      this.model.offset = {
        x: 0,
        y: 0,
        z: 0
      }
      this.viewerOptions = {
        initializerOptions: {
          env: "AutodeskProduction",
          getAccessToken: (onGetAccessToken: (token: string, expire: number) => void) => {
            this.modelsService.getToken().subscribe(res => {
              onGetAccessToken(res.access_token, res.expires_in);
            })
          },
          api: "derivativeV2",
          enableMemoryManagement: true
        },
        viewerConfig: {
          extensions: [OriginExtension.extensionName, ZoneExtension.extensionName, UnitExtension.extensionName],
          theme: this.user.theme == "light" ? "bim-theme" : "dark-theme"
        },
        onViewerScriptsLoaded: () => {
          // Register a custom extension          
          Extension.registerExtension(OriginExtension.extensionName, OriginExtension);
          Extension.registerExtension(ZoneExtension.extensionName, ZoneExtension);
          Extension.registerExtension(UnitExtension.extensionName, UnitExtension);

        },
        onViewerInitialized: (args: ViewerInitializedEvent) => this.loadDocument(args)
      };
    });
  }

  ngOnInit() {

    // this.project = this.projectsService.currentProjectValue;

  }
  public loadDocument(args: ViewerInitializedEvent) {

    this.viewer = args.viewer;
    this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, () => {
      this.model.offset = this.viewer.model.getData().globalOffset;

      this.originExt = this.viewer.loadedExtensions[OriginExtension.extensionName];
      this.originExt.modelsService = this.modelsService;
      this.originExt.translate = this.translate;
      this.originExt.model = this.model;
      this.originExt.init()

      this.zoneExt = this.viewer.loadedExtensions[ZoneExtension.extensionName];
      this.zoneExt.zonesService = this.zonesService;
      this.zoneExt.translate = this.translate;
      this.zoneExt.model = this.model;
      this.zoneExt.init()

      this.unitExt = this.viewer.loadedExtensions[UnitExtension.extensionName];
      this.unitExt.unitsService = this.unitsService;
      this.unitExt.modelsService = this.modelsService;
      this.unitExt.trackersService = this.trackersService;
      this.unitExt.translate = this.translate;
      this.unitExt.model = this.model;
      this.unitExt.units = this.units;
      this.unitExt.init();

      this.viewer.setProgressiveRendering(false);
      this.initSocket();

    })

    args.viewerComponent.DocumentId = this.model.urn;
  }
  initSocket() {
    this.socket.getTracks().then(socket => {
      this.socketTrackSub = socket.subscribe(data => {

        if (this.playMode == 'realtime') {
          data.forEach(async t => {
            this.unitExt.updateFromTrack(t);
          })
          // this.viewer.impl.invalidate(true, true, true);
          if (this.viewer && this.viewer.impl)
            this.viewer.impl.sceneUpdated(true);
        }
      })
    })
  }
  public documentChanged(event: DocumentChangedEvent) {
    const { document } = event;
    if (!document.getRoot()) return;


  }
  onPlayerChanged(data) {

    this.playMode = data.playMode;

    if (this.playMode == 'realtime' || data.playerState !== 'play') {
      return;
    }

    var ids = this.units.array.map((unit) => {
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
        this.unitExt.updateFromTrack(t);
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
