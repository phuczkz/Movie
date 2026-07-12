import * as ophimApi from './movies';
import * as kkphimApi from './movies2';

export const movieApi = {
  ophim: {
    getLatest: ophimApi.getLatest,
    getSeries: ophimApi.getSeries,
    getSingle: ophimApi.getSingle,
    getChieuRap: ophimApi.getOphimChieuRap,
    getHoatHinh: ophimApi.getOphimHoatHinh,
    getCategory: (slug, page, params) => ophimApi.getCategory(slug, page, params),
    getCountry: (slug, page, params) => ophimApi.getCountry(slug, page, params),
    getDetail: (slug) => ophimApi.getDetail(slug),
    search: (keyword, page) => ophimApi.searchMovies(keyword, page),
    getByYear: (year, page) => ophimApi.getByYear(year, page),
  },
  kkphim: {
    getLatest: kkphimApi.getKKphimLatest,
    getSeries: kkphimApi.getKKphimSeries,
    getSingle: kkphimApi.getKKphimSingle,
    getChieuRap: kkphimApi.getKKphimChieuRap,
    getHoatHinh: kkphimApi.getKKphimHoatHinh,
    getCategory: (slug, page, params) => kkphimApi.getKKphimByCategory(slug, page, params),
    getCountry: (slug, page, params) => kkphimApi.getKKphimByCountry(slug, page, params),
    getDetail: (slug, options) => kkphimApi.getKKphimDetail(slug, options),
    search: (keyword, page) => kkphimApi.searchKKphim(keyword, page),
    getByYear: (year, page) => kkphimApi.getKKphimByYear(year, page),
  }
};
