import { TestBed } from '@angular/core/testing';

import { TamperebussesService } from './tamperebusses.service';

describe('TamperebussesService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TamperebussesService = TestBed.get(TamperebussesService);
    expect(service).toBeTruthy();
  });
});
