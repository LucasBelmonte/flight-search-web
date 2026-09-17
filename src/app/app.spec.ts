import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('oferece o link de pular para o conteúdo como primeiro elemento focável', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const skip = el.querySelector('a.skip-link');

    expect(skip).toBeTruthy();
    expect(skip?.getAttribute('href')).toBe('#conteudo');

    // O alvo precisa existir, senão o link não leva a lugar nenhum.
    expect(el.querySelector('#conteudo')).toBeTruthy();
  });

  it('usa marcos semânticos para navegação por leitor de tela', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('header')).toBeTruthy();
    expect(el.querySelector('main')).toBeTruthy();
    expect(el.querySelector('footer')).toBeTruthy();
  });
});
