"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/signup" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <span className="text-xs text-emerald-600 font-bold tracking-wider">BOOSTTECH</span>
              <span className="block text-sm font-bold text-gray-900 -mt-0.5">縦型ショート動画<span className="text-emerald-600">分析</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              ログイン
            </Link>
            <Link href="/signup" className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* タイトル */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">利用規約</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span>制定日：2026年2月7日</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>最終更新日：2026年2月7日</span>
          </div>
        </div>

        {/* 規約本文 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-10">

          {/* 第1条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
              第1条（目的）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本利用規約（以下「本規約」といいます。）は、BOOSTTECH（以下「当社」といいます。）が提供する縦型ショート動画分析サービス「BOOSTTECH」（以下「本サービス」といいます。）の利用に関する条件を、本サービスを利用するすべてのお客様（以下「利用者」といいます。）と当社との間で定めるものです。利用者は、本規約に同意の上、本サービスを利用するものとします。
            </p>
          </section>

          {/* 第2条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
              第2条（定義）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>「本サービス」とは、当社が提供するTikTok、YouTube Shorts、Instagram Reelsなどの縦型ショート動画に関するトレンド分析、データ収集、レポート出力、コンテンツ分析その他関連する一切のサービスをいいます。</li>
              <li>「利用者」とは、本規約に同意の上、当社所定の方法により本サービスの利用登録を行った法人、団体または個人をいいます。</li>
              <li>「アカウント」とは、利用者が本サービスを利用するために必要な、IDおよびパスワード等の認証情報をいいます。</li>
              <li>「利用料金」とは、本サービスの利用の対価として、利用者が当社に支払う料金をいいます。</li>
              <li>「コンテンツ」とは、本サービスを通じて提供されるデータ、分析結果、レポート、テキスト、画像その他一切の情報をいいます。</li>
            </ol>
          </section>

          {/* 第3条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
              第3条（利用登録）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>本サービスの利用を希望する者（以下「登録希望者」といいます。）は、当社所定の方法により利用登録の申込みを行うものとします。</li>
              <li>当社は、登録希望者が以下のいずれかに該当すると判断した場合、利用登録を拒否することがあり、その理由について開示義務を負いません。
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                  <li>登録申込みの内容に虚偽、誤記または記載漏れがあった場合</li>
                  <li>過去に本規約に違反したことがある場合</li>
                  <li>反社会的勢力等に該当すると判断された場合</li>
                  <li>その他、当社が利用登録を適当でないと判断した場合</li>
                </ul>
              </li>
              <li>利用登録は、当社が登録を承認した時点で完了するものとします。</li>
            </ol>
          </section>

          {/* 第4条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
              第4条（アカウントの管理）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>利用者は、自己の責任においてアカウントを適切に管理するものとし、第三者に使用させ、または貸与、譲渡、売買等をしてはならないものとします。</li>
              <li>アカウントの管理不十分、使用上の過誤、第三者の使用等による損害の責任は利用者が負うものとし、当社は一切の責任を負いません。</li>
              <li>利用者は、アカウントが盗用されまたは第三者に使用されていることが判明した場合には、直ちにその旨を当社に通知するとともに、当社の指示に従うものとします。</li>
            </ol>
          </section>

          {/* 第5条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
              第5条（利用料金および支払方法）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>本サービスの利用料金は、当社が別途定め、本サービスのウェブサイト上に表示するプラン（Free、Starter、Premium、Max等）に従うものとします。</li>
              <li>利用者は、当社が定める支払方法により、利用料金を支払うものとします。</li>
              <li>当社は、利用料金を変更する場合、事前に相当期間をもって利用者に通知するものとします。</li>
              <li>利用者が利用料金の支払を遅滞した場合、利用者は年14.6％の割合による遅延損害金を当社に支払うものとします。</li>
            </ol>
          </section>

          {/* 第6条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">6</span>
              第6条（サービスの内容）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">本サービスは、以下の機能を含みます（プランにより利用可能な機能は異なります）。</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
              <li>TikTok、YouTube Shorts、Instagram Reels等のプラットフォームにおける縦型ショート動画のトレンド分析</li>
              <li>動画のパフォーマンスデータの収集および可視化</li>
              <li>AIによる動画構成分析およびフック分析</li>
              <li>リアルタイムランキングの提供</li>
              <li>分析レポートの作成およびエクスポート</li>
              <li>コンテンツ企画に関するインサイトの提供</li>
              <li>その他当社が随時追加する機能</li>
            </ol>
          </section>

          {/* 第7条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">7</span>
              第7条（禁止事項）
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">利用者は、本サービスの利用にあたり、以下の行為をしてはならないものとします。</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスに含まれる著作権、商標権その他の知的財産権を侵害する行為</li>
              <li>当社、他の利用者またはその他の第三者のサーバーまたはネットワークの機能を破壊し、または妨害する行為</li>
              <li>本サービスによって得られた情報を商業的に利用する行為（当社が許諾した場合を除く）</li>
              <li>本サービスの運営を妨害するおそれのある行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他の利用者に関する個人情報等を収集または蓄積する行為</li>
              <li>不正な目的を持って本サービスを利用する行為</li>
              <li>本サービスの他の利用者またはその他の第三者に不利益、損害、不快感を与える行為</li>
              <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>リバースエンジニアリング、逆コンパイル、逆アセンブルその他本サービスのソースコードを解析する行為</li>
              <li>本サービスから得たデータを自動的に収集するためのスクレイピング、クローリングその他の技術的手段を使用する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ol>
          </section>

          {/* 第8条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">8</span>
              第8条（本サービスの提供の停止等）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>当社は、以下のいずれかの事由があると判断した場合、利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                  <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                  <li>地震、落雷、火災、停電または天災などの不可抗力により本サービスの提供が困難となった場合</li>
                  <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                  <li>TikTok、YouTube、Instagram等の外部プラットフォームのAPI変更、サービス停止等により本サービスの提供が困難となった場合</li>
                  <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                </ul>
              </li>
              <li>当社は、本サービスの提供の停止または中断により、利用者または第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
            </ol>
          </section>

          {/* 第9条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">9</span>
              第9条（知的財産権）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>本サービスおよび本サービスに関連する一切の知的財産権は当社または当社にライセンスを許諾している者に帰属するものとします。</li>
              <li>利用者は、本サービスを通じて提供されるコンテンツを、本サービスの利用に必要な範囲で使用することができますが、当社の事前の書面による承諾なく、複製、翻案、公衆送信その他の方法により利用してはならないものとします。</li>
              <li>本規約に基づく本サービスの利用許諾は、本サービスに関する当社または当社にライセンスを許諾している者の知的財産権の使用許諾を意味するものではありません。</li>
            </ol>
          </section>

          {/* 第10条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">10</span>
              第10条（データの取扱い）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>当社は、利用者が本サービスに入力したデータおよび本サービスの利用に伴い生成されたデータ（以下「利用者データ」といいます。）を、本サービスの提供および改善の目的で利用することがあります。</li>
              <li>当社は、利用者データを統計的に処理した情報（個人を特定できない形式に限ります。）を、本サービスの改善、新機能の開発、研究等の目的で利用することがあります。</li>
              <li>当社は、利用者の個人情報を、当社が別途定めるプライバシーポリシーに従い適切に取り扱うものとします。</li>
              <li>利用者が本サービスを退会した場合、当社は合理的な期間経過後に利用者データを削除できるものとします。ただし、法令に基づき保存が必要な場合はこの限りではありません。</li>
            </ol>
          </section>

          {/* 第11条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">11</span>
              第11条（利用制限および登録抹消）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>当社は、利用者が以下のいずれかに該当する場合には、事前の通知なく、利用者に対して本サービスの全部もしくは一部の利用を制限し、または利用者としての登録を抹消することができるものとします。
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                  <li>本規約のいずれかの条項に違反した場合</li>
                  <li>登録事項に虚偽の事実があることが判明した場合</li>
                  <li>利用料金の支払を怠った場合</li>
                  <li>当社からの連絡に対し、一定期間返答がない場合</li>
                  <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                  <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
                </ul>
              </li>
              <li>当社は、本条に基づき当社が行った行為により利用者に生じた損害について、一切の責任を負いません。</li>
            </ol>
          </section>

          {/* 第12条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">12</span>
              第12条（退会）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>利用者は、当社所定の退会手続により、本サービスから退会できるものとします。</li>
              <li>退会にあたり、当社に対して負っている債務がある場合、利用者は当社に対して負っている債務の一切について当然に期限の利益を失い、直ちに当社に対してすべての債務の支払を行わなければなりません。</li>
            </ol>
          </section>

          {/* 第13条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">13</span>
              第13条（保証の否認および免責事項）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
              <li>本サービスにおいて提供される分析データおよびレポートは、各プラットフォーム（TikTok、YouTube、Instagram等）から取得可能な情報に基づくものであり、その正確性、網羅性および最新性を保証するものではありません。</li>
              <li>当社は、本サービスに起因して利用者に生じたあらゆる損害について、当社の故意または重大な過失による場合を除き、一切の責任を負いません。</li>
              <li>当社が利用者に対して損害賠償責任を負う場合であっても、当社の賠償責任は、当該損害の直接の原因となったサービスについて利用者が過去12か月間に当社に支払った利用料金の総額を上限とします。</li>
              <li>当社は、本サービスに関して、利用者と他の利用者または第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
            </ol>
          </section>

          {/* 第14条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">14</span>
              第14条（サービス内容の変更等）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、利用者への事前の通知をもって、本サービスの内容を変更、追加または廃止することがあり、利用者はこれを承諾するものとします。
            </p>
          </section>

          {/* 第15条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">15</span>
              第15条（利用規約の変更）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>当社は、必要と判断した場合には、利用者の個別の同意を要せず、本規約を変更することができるものとします。</li>
              <li>当社は、本規約を変更する場合、変更後の本規約の施行時期および内容を本サービスのウェブサイト上での掲示その他の適切な方法により周知し、または利用者に通知します。</li>
              <li>変更後の本規約の効力発生日以降に利用者が本サービスを利用したときは、利用者は変更後の規約に同意したものとみなします。</li>
            </ol>
          </section>

          {/* 第16条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">16</span>
              第16条（個人情報の取扱い）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、本サービスの利用によって取得する個人情報については、当社が別途定めるプライバシーポリシーに従い適切に取り扱うものとします。
            </p>
          </section>

          {/* 第17条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">17</span>
              第17条（通知または連絡）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              利用者と当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、利用者から当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは発信時に利用者へ到達したものとみなします。
            </p>
          </section>

          {/* 第18条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">18</span>
              第18条（権利義務の譲渡の禁止）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              利用者は、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
            </p>
          </section>

          {/* 第19条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">19</span>
              第19条（秘密保持）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>利用者は、本サービスの利用に関連して知り得た当社の技術上、営業上その他の秘密情報を、当社の事前の書面による承諾なく第三者に開示または漏洩してはならないものとします。</li>
              <li>前項の義務は、本サービスの利用終了後も存続するものとします。</li>
            </ol>
          </section>

          {/* 第20条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">20</span>
              第20条（反社会的勢力の排除）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>利用者は、現在および将来にわたり、反社会的勢力（暴力団、暴力団員、暴力団準構成員、暴力団関係企業、総会屋等、社会運動等標ぼうゴロ、特殊知能暴力集団等、その他これに準ずる者をいいます。）に該当しないこと、および反社会的勢力と関係を有していないことを表明し、保証するものとします。</li>
              <li>当社は、利用者が前項に違反した場合、事前の通知なく本サービスの利用を停止し、または利用契約を解除することができるものとします。</li>
            </ol>
          </section>

          {/* 第21条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">21</span>
              第21条（分離可能性）
            </h2>
            <p className="text-gray-700 leading-relaxed">
              本規約のいずれかの条項またはその一部が、消費者契約法その他の法令等により無効または執行不能と判断された場合であっても、本規約の残りの規定および一部が無効または執行不能と判断された規定の残りの部分は、継続して完全に効力を有するものとします。
            </p>
          </section>

          {/* 第22条 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">22</span>
              第22条（準拠法および管轄裁判所）
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 leading-relaxed">
              <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
              <li>本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>

          {/* 制定日 */}
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600">2026年2月7日 制定</p>
            <p className="text-lg font-bold text-emerald-700 mt-2">BOOSTTECH</p>
          </div>
        </div>

        {/* フッターナビ */}
        <div className="mt-8 text-center">
          <Link href="/signup" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            サービスページに戻る
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm">&copy; 2026 BOOSTTECH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
