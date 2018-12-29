import { TestBed } from '@angular/core/testing';

import { TrainsService } from './trains.service';

describe('TrainsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TrainsService = TestBed.get(TrainsService);
    expect(service).toBeTruthy();
  });
});
