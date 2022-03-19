import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewerMapsComponent } from './viewer-maps.component';

describe('ViewerMapsComponent', () => {
  let component: ViewerMapsComponent;
  let fixture: ComponentFixture<ViewerMapsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewerMapsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewerMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
