// Notices shared by the input page and the result page.
import { SOURCE_REPO_URL } from './config.ts'

const link = 'font-bold text-teal-800 underline'

export default function Footer() {
  return (
    <footer className="mt-8 space-y-1 border-t-2 border-gray-300 pt-4 text-base text-gray-800">
      <p>⚠️ 재미·참고용입니다. 결과를 보장하지 않으며 중요한 결정은 전문가와 상의하세요.</p>
      <p>
        소스 코드는 MIT 라이선스로 공개됩니다.
        {SOURCE_REPO_URL && <> <a className={link} href={SOURCE_REPO_URL} target="_blank" rel="noopener noreferrer">소스 코드 보기</a></>}
      </p>
      <p>사주 엔진 일부: fortuneteller (MIT, Hoshin)</p>
      {SOURCE_REPO_URL && (
        <p>
          토정비결·주역 자료는 Apache-2.0 등 오픈소스를 사용합니다.{' '}
          <a className={link} href={`${SOURCE_REPO_URL}/blob/main/NOTICE`} target="_blank" rel="noopener noreferrer">오픈소스 고지(NOTICE)</a>
        </p>
      )}
    </footer>
  )
}
