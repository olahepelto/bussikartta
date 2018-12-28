import { Module3Module } from './module3.module';

describe('Module3Module', () => {
  let module3Module: Module3Module;

  beforeEach(() => {
    module3Module = new Module3Module();
  });

  it('should create an instance', () => {
    expect(module3Module).toBeTruthy();
  });
});
