import { useQuery } from '@tanstack/react-query';
import { movieApi } from '../api';

export const useMoviesList = (type, provider = 'ophim', page = 1, params = {}) => {
  return useQuery({
    queryKey: ['movies', type, provider, page, params],
    queryFn: () => {
      const api = movieApi[provider];
      if (!api) throw new Error(`Provider ${provider} not supported`);
      
      switch (type) {
        case 'latest': return api.getLatest(page, params);
        case 'series': return api.getSeries(page, params);
        case 'single': return api.getSingle(page, params);
        case 'chieurap': return api.getChieuRap(page, params);
        case 'hoathinh': return api.getHoatHinh(page, params);
        default: return api.getLatest(page, params);
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useMovieCategory = (category, provider = 'ophim', page = 1, params = {}) => {
  return useQuery({
    queryKey: ['movies', 'category', category, provider, page, params],
    queryFn: () => movieApi[provider].getCategory(category, page, params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovieCountry = (country, provider = 'ophim', page = 1, params = {}) => {
  return useQuery({
    queryKey: ['movies', 'country', country, provider, page, params],
    queryFn: () => movieApi[provider].getCountry(country, page, params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovieDetail = (slug, provider = 'ophim') => {
  return useQuery({
    queryKey: ['movieDetail', slug, provider],
    queryFn: () => movieApi[provider].getDetail(slug),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovieSearch = (keyword, provider = 'ophim', page = 1) => {
  return useQuery({
    queryKey: ['movies', 'search', keyword, provider, page],
    queryFn: () => movieApi[provider].search(keyword, page),
    staleTime: 5 * 60 * 1000,
    enabled: !!keyword,
  });
};

export const useMovieByYear = (year, provider = 'ophim', page = 1) => {
  return useQuery({
    queryKey: ['movies', 'year', year, provider, page],
    queryFn: () => movieApi[provider].getByYear(year, page),
    staleTime: 5 * 60 * 1000,
    enabled: !!year,
  });
};
