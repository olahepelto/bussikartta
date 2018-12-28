import { TestBed } from '@angular/core/testing';

import { BussesService } from './busses.service';

describe('BussesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BussesService = TestBed.get(BussesService);
    expect(service).toBeTruthy();
  });
});
