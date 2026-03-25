import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpiryStatus } from '../../../core/models/inventory-item.model';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;
  let component: StatusBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render "Abgelaufen" for expired items', () => {
    fixture.componentRef.setInput('status', ExpiryStatus.Expired);
    fixture.detectChanges();

    expect(component.text()).toBe('Abgelaufen');
    expect(fixture.nativeElement.textContent).toContain('Abgelaufen');
  });

  it('should render "Läuft bald ab" for expiring-soon items', () => {
    fixture.componentRef.setInput('status', ExpiryStatus.ExpiringSoon);
    fixture.detectChanges();

    expect(component.text()).toBe('Läuft bald ab');
    expect(fixture.nativeElement.textContent).toContain('Läuft bald ab');
  });

  it('should render "Frisch" for normal items', () => {
    fixture.componentRef.setInput('status', ExpiryStatus.Normal);
    fixture.detectChanges();

    expect(component.text()).toBe('Frisch');
    expect(fixture.nativeElement.textContent).toContain('Frisch');
  });
});

