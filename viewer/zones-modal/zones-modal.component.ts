import { Component, EventEmitter, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { ZonesService } from 'src/app/services/zones.service';
@Component({
  selector: 'app-zones-modal',
  templateUrl: './zones-modal.component.html',
  styleUrls: ['./zones-modal.component.scss']
})
export class ZonesModalComponent implements OnInit {
  displayedColumns: string[] = ['display', 'name', 'color', 'opacity', 'actions'];
  dataSource: any;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  onAdd = new EventEmitter();
  enableAllzones = false;
  isModifyZone = false;
  zoneId: any;
  zoneForm: any;
  colors: any[] = [];
  zone: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ZonesModalComponent>,
    private zonesService: ZonesService, private fb: FormBuilder,
    private translate: TranslateService) {
    this.dataSource = new MatTableDataSource<any>(this.data.zones);
    this.translate.get('lodaded').subscribe(() => { });
    this.colors = [
      { title: `Danger(${this.translate.instant('colors.red')})`, value: 'danger' },
      { title: `Warning(${this.translate.instant('colors.orange')})`, value: 'warning' },
      { title: `Primary(${this.translate.instant('colors.blue')})`, value: 'primary' },
      { title: `Success(${this.translate.instant('colors.green')})`, value: 'success' },
      { title: `Info(${this.translate.instant('colors.lightGrey')})`, value: 'info' },
      { title: `Dark(${this.translate.instant('colors.black')})`, value: 'dark' },
      { title: `Muted(${this.translate.instant('colors.grey')})`, value: 'muted' },
    ]
  }

  ngOnInit(): void {
    this.showCheckedBox();
    this.zoneForm = this.fb.group({
      name: ['',],
      color: ['',],
      opacity: ['',]
    })
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  deleteZone(zone) {

    this.zonesService.removeZone(zone.id).subscribe(res => {
      this.zonesService.getZones().subscribe(res => {
        this.dataSource = new MatTableDataSource<any>(res);
        this.dataSource.paginator = this.paginator;
        this.data.zones = res;
        this.onAdd.emit({ zones: this.data.zones });
        this.showCheckedBox()
      }, err => console.error(err))
    }, err => console.error(err))
  }

  showCheckedBox() {
    let found = true;
    this.data.zones.forEach(t => {
      if (!t.visible) found = false
    })

    found ? this.enableAllzones = true : this.enableAllzones = false;
    if (this.data.zones.length == 0) this.enableAllzones = false
  }

  createZone() {
    this.dialogRef.close({ createZone: true })
  }

  showAllZones(event) {
    if (event.checked) {
      this.data.zones.forEach(t => t.visible = true);
    } else {
      this.data.zones.forEach(t => t.visible = false)
    }

    this.onAdd.emit({ zones: this.data.zones });
    this.data.zones.forEach(t => this.updateZone(t))
  }

  showZone(event, zone) {

    if (event.checked) {
      this.data.zones.forEach(t => {
        if (t.id == zone.id) t.visible = true
      })
    } else {
      this.data.zones.forEach(t => {
        if (t.id == zone.id) t.visible = false
      })
    }

    this.showCheckedBox();
    this.onAdd.emit({ zones: this.data.zones });

    const findIndex = this.data.zones.findIndex(t => t.id == zone.id);
    this.updateZone(this.data.zones[findIndex])
  }

  updateZone(zone) {
    this.zonesService.updateZone(zone).subscribe(res => {
      this.isModifyZone = false;
      this.zoneId = null;
      this.zonesService.getZones().subscribe(res => {
        this.data.zones = res;
        this.onAdd.emit({ zones: this.data.zones });
      }, err => console.error(err))
    }, err => console.error(err))
  }

  modifyZone(zone) {
    this.zoneForm.patchValue({ name: zone.name, color: zone.color, opacity: zone.alpha })
    this.isModifyZone = true;
    this.zoneId = zone.id;
    this.zone = zone;
  }

  setChangesofZone() {
    this.zone.name = this.zoneForm.value.name;
    this.zone.color = this.zoneForm.value.color;
    this.zone.alpha = this.zoneForm.value.opacity;
    this.updateZone(this.zone)
  }
}
