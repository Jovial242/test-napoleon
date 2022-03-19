import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TracesModalComponent } from './traces-modal.component';

describe('TracesModalComponent', () => {
  let component: TracesModalComponent;
  let fixture: ComponentFixture<TracesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TracesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TracesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
