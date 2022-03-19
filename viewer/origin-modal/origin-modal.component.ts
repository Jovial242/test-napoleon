import { Component, EventEmitter, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModelsService } from 'src/app/services/models.service';

@Component({
  selector: 'app-origin-modal',
  templateUrl: './origin-modal.component.html',
  styleUrls: ['./origin-modal.component.scss']
})
export class OriginModalComponent implements OnInit {
  onAdd = new EventEmitter();
  modelData: any;
  originForm: any;
  srcResult: any;
  mapCoord: any = {
    north: { type: Number },
    east: { type: Number },
    south: { type: Number },
    west: { type: Number }
  };

  newObject: any = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private fb: FormBuilder, private modelsService: ModelsService) { }

  ngOnInit(): void {    
    this.modelData = this.data.modelData;
    this.initializeForm()
  }

  onFileSelected(event) {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const url = e.target.result;
        this.modelData.mapImage = url.toString();
        this.newObject.mapImage = this.modelData.mapImage;
        this.formData({ target: { id: 'mapImage', value: url.toString() } })
      }

      reader.onerror = error => {
        console.error('error', error);
      }

      reader.onerror = error => {
        console.error('error', error);
      }
    }
  }

  initializeForm() {
    this.originForm = this.fb.group({
      north: [this.modelData.mapCoord.north, Validators.required],
      south: [this.modelData.mapCoord.south, Validators.required],
      west: [this.modelData.mapCoord.west, Validators.required],
      east: [this.modelData.mapCoord.east, Validators.required],
      latitude: [this.modelData.origin.position.lat, Validators.required],
      longitude: [this.modelData.origin.position.lon, Validators.required],
      mapLatitude: [this.modelData.origin.position.mapLat, Validators.required],
      mapLongitude: [this.modelData.origin.position.mapLon, Validators.required],
      angle: [this.modelData.origin.angle, Validators.required],
      mapAngle: [this.modelData.origin.mapAngle, Validators.required],
      zoom: [this.modelData.origin.zoom, Validators.required],
      zoomEnabled: [this.modelData.origin.zoomEnabled, Validators.required],
      panEnabled: [this.modelData.origin.panEnabled, Validators.required]
    });

    this.newObject = this.originForm.value;
    this.newObject.mapImage = this.modelData.mapImage;
  }

  formData(ev) {

    this.newObject[ev.target.id] = ev.target.value;
    const cte = 0.001;
    const cte2 = 0.002;

    if (ev.target.id == 'north' || ev.target.id == 'south' || ev.target.id == 'latitude') this.newObject[ev.target.id] = this.setLimitValue(this.newObject[ev.target.id], 90, -90)
    else this.newObject[ev.target.id] = this.setLimitValue(this.newObject[ev.target.id], 180, -180);

    if ((this.mapCoord.north < this.mapCoord.south) || (this.mapCoord.north === this.mapCoord.south)) {
      this.mapCoord.south = this.mapCoord.north - cte2;
    }

    if ((this.newObject.east < this.newObject.west) || (this.newObject.east === this.newObject.west)) {
      this.newObject.west = this.newObject.east - cte2;
    }

    let objectToSend = {
      id: this.data.projectId,
      mapImage: this.newObject.mapImage,
      mapCoord: { north: parseFloat(this.newObject.north), south: parseFloat(this.newObject.south), east: parseFloat(this.newObject.east), west: parseFloat(this.newObject.west) },
      origin: this.modelData.origin
    };

    objectToSend.origin.position.lat = parseFloat(this.newObject.latitude);
    objectToSend.origin.position.lon = parseFloat(this.newObject.longitude);
    objectToSend.origin.position.mapLat = parseFloat(this.newObject.mapLatitude);
    objectToSend.origin.position.mapLon = parseFloat(this.newObject.mapLongitude);
    objectToSend.origin.angle = parseFloat(this.newObject.angle);
    objectToSend.origin.mapAngle = parseFloat(this.newObject.mapAngle);
    objectToSend.origin.zoom = parseFloat(this.newObject.zoom);
    objectToSend.origin.zoomEnabled = this.newObject.zoomEnabled;
    objectToSend.origin.panEnabled = this.newObject.panEnabled;

    this.onAdd.emit({ currentModel: objectToSend });
    this.modelsService.updateModel(objectToSend).subscribe(res => { }, error => console.error(error));
  }

  setLimitValue(point, val, _val) {
    if ((point > val)) {
      point = val - 0.002;
    } else if (point < _val) {
      point = _val + 0.002;
    }
    return point;
  }

  checkBoxEvents(ev) {
    this.newObject[ev.source.id] = ev.checked;
    this.formData({ target: { id: ev.source.id, value: ev.checked } })
  }

}
