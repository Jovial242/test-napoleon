import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewerForgeComponent } from './viewer-forge.component';

describe('ViewerForgeComponent', () => {
  let component: ViewerForgeComponent;
  let fixture: ComponentFixture<ViewerForgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ViewerForgeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewerForgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
