import $, { type } from 'jquery'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

type MangaListFilterOptions = Array<{
  label : string,
  name : string | number,
  options : Array<{ label : string, value : string }>
}>

function parseIntSafe(value : string, fallback : number = 0) : number {
  const parsed = parseInt(value)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * This function will be invoked in manga list page.
 * The returned data will be used as the filter options for the manga list.
 */
// async function setMangaListFilterOptions () {
//   try {
//     const result: MangaListFilterOptions = []
//     // ...
//     window.Rulia.endWithResult(result)
//   } catch (error) {
//     window.Rulia.endWithResult([])
//   }
// }

async function setMangaListFilterOptions() {
  try {

    const rawStr = await window.Rulia.httpRequest({
      url: 'https://everia.club/',
      method: 'GET'
    })

    let $typeList = $($.parseHTML(rawStr))
      .find('#menu-menu')
      .children('.menu-item')

    let result : MangaListFilterOptions = [{
      label: 'Type',
      name: 'filter_type_id',
      options: [
        {
          label: 'All',
          value: 'all'
        }
      ]
    }]

    $typeList.each((_, el) => {
      const $a = $(el).find('.menu-link')
      const label = $a.find('.text-wrap').text()
      const str = $a.attr('href') || ''
      const match = str.match(/\/category\/([^\/]+)/)
      let value = ''

      if (match && match[1]) {
        value = match[1];
      }

      result[0].options.push(
        {
          label: label,
          value: value
        }
      )
    })

    window.Rulia.endWithResult(result);
  } catch (error) {
    window.Rulia.endWithResult([])
  }
}

async function handleMangaListSearch(rawPage : number, keyword : string) {
  // URL: https://mto.to/search?word=<KEYWORD>&page=<PAGE>

  const page = rawPage;

  try {

    let url = 'https://everia.club/'
    if (page > 1) {
      url = url + 'page/' + page.toString() + '/?s=' + keyword
    } else {
      url = url + '/?s=' + keyword
    }

    const rawStr = await window.Rulia.httpRequest({
      method: 'GET',
      url: url
    })

    let $mangaList = $($.parseHTML(rawStr))
      .find('#content')
      .children('.post')

    const result : IGetMangaListResult = {
      list: []
    }

    $mangaList.each((_, el) => {

      const $title = $(el).find('.search-entry-title a')
      const titleText = $title.text()

      const $thumbnail = $(el).find('.search-entry-inner .thumbnail')

      const url = $thumbnail.find('a').attr('href') || ''

      const $cover = $thumbnail.find('.attachment-thumbnail')
      const coverSrc = $cover.attr('src') || 'https://i.postimg.cc/QxKfvThs/1-1x.png'


      const group = [
        url,
        coverSrc
      ]

      const comboUrl = JSON.stringify(group)

      result.list.push({
        title: titleText,
        url: comboUrl,
        coverUrl: coverSrc
      })

    })

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get manga list for manga list page.
 * This function will be invoked by Rulia in the manga list page.
 *
 * @param {string} rawPage Page number. Please notice this arg will be passed from Rulia in string type.
 * @param {string} rawPageSize Page size. Please notice this arg will be passed from Rulia in string type.
 * @param {string} keyword The search keyword. It will empty when user doesn't provide it.
 * @param {string} rawFilterOptions The filter options.
 * @returns
 */
async function getMangaList(rawPage : string, rawPageSize : string, keyword ?: string, rawFilterOptions ?: string) {

  const page = parseInt(rawPage);

  // If keyword is provided go for the search page.
  if (keyword) {
    await handleMangaListSearch(page, keyword)
    return
  }

  // Get manga list from 'https://everia.club/' or 'https://everia.club/category/cosplay/'.
  // The first page is the whole HTML page, after that it reponses in JSON format that contains parital HTML codes.
  let url = 'https://everia.club/'

  let filterOptions : Record<string, string> = {}
  if (rawFilterOptions) {
    try {
      filterOptions = JSON.parse(rawFilterOptions)
    } catch (error) {
      filterOptions = {}
    }
  }

  if (filterOptions.filter_type_id != 'all') {
    url = url + 'category/' + filterOptions.filter_type_id + '/'
  }

  if (page > 1) {
    url = url + 'page/' + page.toString() + '/'
  }

  try {

    const rawStr = await window.Rulia.httpRequest({
      url: url,
      method: 'GET'
    })

    let $mangaList = $($.parseHTML(rawStr)).find('#blog-entries').children('.blog-entry')

    const result : IGetMangaListResult = {
      list: []
    }

    $mangaList.each((_, el) => {

      const $title = $(el).find('.blog-entry-title a')
      const titleText = $title.text()

      const $thumbnail = $(el).find('.blog-entry-inner .thumbnail')

      const url = $thumbnail.find('a').attr('href') || ''

      const $cover = $thumbnail.find('.attachment-thumbnail')
      const coverSrc = $cover.attr('src') || 'https://i.postimg.cc/QxKfvThs/1-1x.png'

      const group = [
        url,
        coverSrc
      ]

      const comboUrl = JSON.stringify(group)

      result.list.push({
        title: titleText,
        url: comboUrl,
        coverUrl: coverSrc
      })
    })

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get data of a single manga.
 * This function will be invoked by Rulia when user clicks a certain manga
 * in the manga list page.
 *
 * @param {string} dataPageUrl This url is from the function "getMangaList".
 * @returns
 */
async function getMangaData(dataPageUrl : string) {
  // The url arg is something like 'https://everia.club/2024/05/21/cosplay-umeko-j-%e3%83%9e%e3%82%b7%e3%83%a5%e3%83%bb%e3%82%ad%e3%83%aa%e3%82%a8%e3%83%a9%e3%82%a4%e3%83%88-set-02/'.
  try {

    let group = JSON.parse(dataPageUrl)

    const rawStr = await window.Rulia.httpRequest({
      method: 'GET',
      url: group[0]
    })

    const $document = $($.parseHTML(rawStr))

    const title = $document.find('.single-post-title').text()

    const coverSrc = group[1]
    const result : IGetMangaDataResult = {
      title: title,
      description: title,
      coverUrl: coverSrc,
      chapterList: [
        {
          title: title,
          url: group[0]
        }
      ]
    }

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * Get image urls of all images from a single episode.
 *
 * @param {string} chapterUrl This url is from the result of the function 'getMangaData'.
 */


async function getChapterImageList(chapterUrl : string) {
  // chapterUrl would be like: 'https://everia.club/2024/05/21/cosplay-umeko-j-%e3%83%9e%e3%82%b7%e3%83%a5%e3%83%bb%e3%82%ad%e3%83%aa%e3%82%a8%e3%83%a9%e3%82%a4%e3%83%88-set-02/'
  try {
    let result : IRuliaChapterImage[] = [];

    const rawStr = await window.Rulia.httpRequest({
      method: 'GET',
      url: chapterUrl
    })

    const $content = $($.parseHTML(rawStr)).find('.wp-block-gallery').children('.wp-block-image')

    $content.each((_, el) => {
      const url = $(el).find('img').attr('src') || 'https://i.postimg.cc/QxKfvThs/1-1x.png'
      result.push({
        url: url,
        width: 1,
        height: 1
      })
    })

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

/**
 * This function will be invoked when Rulia is going to download a image.
 *
 * Since some websites require special verification before downloading images,
 * you may need to implement these verification logics within this method.
 * If the target website doesn't need special logic, you can just directly
 * return the parameter 'url'.
 *
 * @param {string} path This url is from the result of the function 'getChapterImageList'
 */
async function getImageUrl(path : string) {
  window.Rulia.endWithResult(path)
}
