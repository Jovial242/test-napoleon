import { Component, Inject, OnInit, ViewChild, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-traces-modal',
  templateUrl: './traces-modal.component.html',
  styleUrls: ['./traces-modal.component.scss']
})
export class TracesModalComponent implements OnInit {
  displayedColumns: string[] = ['name', 'show', 'collider', 'trace'];
  dataSource: any;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  listColor: any[] = [
    { name: "Primary", value: "#3c8dbc" }, { name: "Danger", value: "#dd4b39" },
    { name: "Success", value: "#00a65a" }, { name: "Info", value: "#666666" },
    { name: "Warning", value: "#f39c12" }, { name: "Lemon", value: "#f3e612" },
    { name: "Teal", value: "#39CCCC" }, { name: "Fuchsia", value: "#F012BE" },
    { name: "Dark", value: "#333333" }, { name: "Info", value: "#DDDDDD" },
    { name: "Muted (Grey)", value: "#808080" }, { name: "White", value: "#FFFFFF" },
    { name: "Custom", value: "custom" }
  ];

  showCollider = true;
  show = true;
  trace = true;
  onAdd = new EventEmitter();

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {    
    this.dataSource = new MatTableDataSource(this.data.trackers);
  }

  ngOnInit(): void {
    this.showCheckedBox();
  }

  @ViewChild(MatSort) sort: MatSort;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator
  }

  applyFilter(event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  showCheckedBox() {
    const val = ['show', 'showCollider', 'trace'];

    val.forEach(a => {
      this[a] = true;
      this.data.trackers.forEach(t => {
        if (!t[a]) this[a] = false
      })
    });
  }

  showTrackers(evt, trackerId, val) {
    if (evt.checked) {
      this.data.trackers.forEach(t => {
        if (t.id == trackerId) t[val] = true
      })
    } else {
      this.data.trackers.forEach(t => {
        if (t.id == trackerId) t[val] = false
      })
    }
    this.onAdd.emit({ trackers: this.data.trackers, action: val });
    this.showCheckedBox();
  }

  showAll(evt, val) {
    if (evt.checked) {
      this[val] = true;
      this.data.trackers.forEach(t => t[val] = true)
    } else {
      this[val] = false;
      this.data.trackers.forEach(t => t[val] = false)
    }
    this.onAdd.emit({ trackers: this.data.trackers, action: val })
    this.showCheckedBox();
  }

  viewReport(){

  }

  deleteReport(){}
}
