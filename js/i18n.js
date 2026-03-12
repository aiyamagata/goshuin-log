// =============================================
// i18n — translations (ja / en)
// =============================================

const TRANSLATIONS = {
  ja: {
    appTitle:          '御朱印ログ',
    tabList:           '一覧',
    tabMap:            '地図',
    addRecord:         '＋ 追加',
    editRecord:        '記録を編集',
    save:              '保存',
    cancel:            'キャンセル',
    delete:            '削除',
    geocode:           '位置取得',
    geocodeHint:       '「位置取得」で寺社名から緯度経度を自動取得',

    fieldName:         '寺社名',
    fieldDate:         '参拝日',
    fieldType:         '種類',
    fieldMemo:         'メモ',
    fieldImage:        '画像',
    imageUploadText:   'タップして写真を選択・撮影',
    imageRemove:       '✕ 画像を削除',
    imageReadError:    '画像の読み込みに失敗しました',
    fieldLat:          '緯度',
    fieldLng:          '経度',

    typeCustom:        '自由入力...',
    typeCustomPlaceholder: '種類を入力',

    searchPlaceholder: '寺社名・メモで検索',
    recordCountFmt:    '{n} 件',
    emptyState:        'まだ記録がありません',
    emptyStateSub:     '最初の参拝を記録しましょう！',
    noResults:         '検索結果がありません',

    deleteConfirmTitle:'削除の確認',
    deleteConfirmMsg:  'この記録を削除しますか？この操作は取り消せません。',

    mapSidebarTitle:   '記録した場所',
    mapNoCoords:       '座標が登録された記録がありません',

    weatherLoading:    '天気取得中…',
    weatherUnavailable:'天気情報なし',
    weatherOn:         '参拝日の天気',

    geocodeLoading:    '位置情報を検索中…',
    geocodeSuccess:    '位置情報を取得しました',
    geocodeError:      '位置情報が見つかりませんでした',
    geocodeNoName:     '先に寺社名を入力してください',

    saved:             '保存しました',
    deleted:           '削除しました',
    validationName:    '寺社名を入力してください',
    validationDate:    '参拝日を選択してください',
    saveError:         '保存に失敗しました',
    deleteError:       '削除に失敗しました',
    loadError:         'データの読み込みに失敗しました',

    authLogin:         'ログイン',
    authSignUp:        '新規登録',
    authNoAccount:     'アカウントをお持ちでない方は',
    authHaveAccount:   'すでにアカウントをお持ちの方は',
    authLoginLink:     'ログイン',
    authSignUpLink:    '新規登録',
    authConfirmEmail:  '確認メールを送信しました。メールのリンクをクリックしてログインしてください。',
    authErrorInvalid:  'メールアドレスまたはパスワードが正しくありません',
    authErrorNotConfirmed: 'メールアドレスの確認が完了していません',
    authErrorAlreadyExists: 'このメールアドレスはすでに登録されています',
    authErrorPassword: 'パスワードは6文字以上で入力してください',
    authErrorRateLimit: 'しばらく時間をおいてから再試行してください',
    authErrorUnknown:  'エラーが発生しました。再試行してください',

    langCode:          'ja',
    langToggleLabel:   'EN',
  },

  en: {
    appTitle:          'Goshuin Log',
    tabList:           'List',
    tabMap:            'Map',
    addRecord:         '＋ Add',
    editRecord:        'Edit Record',
    save:              'Save',
    cancel:            'Cancel',
    delete:            'Delete',
    geocode:           'Get Location',
    geocodeHint:       'Auto-fill coordinates from shrine/temple name',

    fieldName:         'Shrine / Temple',
    fieldDate:         'Visit Date',
    fieldType:         'Type',
    fieldMemo:         'Memo',
    fieldImage:        'Photo',
    imageUploadText:   'Tap to take photo or choose from library',
    imageRemove:       '✕ Remove photo',
    imageReadError:    'Failed to read image',
    fieldLat:          'Latitude',
    fieldLng:          'Longitude',

    typeCustom:        'Custom...',
    typeCustomPlaceholder: 'Enter type',

    searchPlaceholder: 'Search by name or memo',
    recordCountFmt:    '{n} records',
    emptyState:        'No records yet',
    emptyStateSub:     'Log your first shrine visit!',
    noResults:         'No results found',

    deleteConfirmTitle:'Confirm Deletion',
    deleteConfirmMsg:  'Delete this record? This cannot be undone.',

    mapSidebarTitle:   'Recorded Locations',
    mapNoCoords:       'No records with coordinates yet',

    weatherLoading:    'Loading weather…',
    weatherUnavailable:'Weather unavailable',
    weatherOn:         'Weather on visit day',

    geocodeLoading:    'Searching location…',
    geocodeSuccess:    'Location found',
    geocodeError:      'Location not found',
    geocodeNoName:     'Please enter a shrine/temple name first',

    saved:             'Saved',
    deleted:           'Deleted',
    validationName:    'Please enter a shrine/temple name',
    validationDate:    'Please select a visit date',
    saveError:         'Failed to save',
    deleteError:       'Failed to delete',
    loadError:         'Failed to load data',

    authLogin:         'Login',
    authSignUp:        'Sign Up',
    authNoAccount:     "Don't have an account?",
    authHaveAccount:   'Already have an account?',
    authLoginLink:     'Login',
    authSignUpLink:    'Sign Up',
    authConfirmEmail:  'Confirmation email sent. Please click the link in the email to log in.',
    authErrorInvalid:  'Invalid email or password',
    authErrorNotConfirmed: 'Email address not confirmed',
    authErrorAlreadyExists: 'This email is already registered',
    authErrorPassword: 'Password must be at least 6 characters',
    authErrorRateLimit: 'Please wait a moment and try again',
    authErrorUnknown:  'An error occurred. Please try again',

    langCode:          'en',
    langToggleLabel:   '日本語',
  },
};

// Type option labels (value -> {ja, en})
const TYPE_LABELS = {
  '御朱印':  { ja: '御朱印',  en: 'Goshuin' },
  '御城印':  { ja: '御城印',  en: 'Gojoin (Castle)' },
  '御首題':  { ja: '御首題',  en: 'Oshudai' },
  '絵馬':    { ja: '絵馬',    en: 'Ema' },
  'その他':  { ja: 'その他',  en: 'Other' },
};

let currentLang = 'ja';

function t(key, vars = {}) {
  let str = (TRANSLATIONS[currentLang] || TRANSLATIONS.ja)[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
}

function getLang() { return currentLang; }

// Translate a type value into current language
function typeLabel(value) {
  if (TYPE_LABELS[value]) return TYPE_LABELS[value][currentLang] || value;
  return value; // custom string
}
