# Factory Radar v10 API 설정

이 버전은 API 비용 폭주를 막기 위해 검색 결과 전체를 좌표 변환하지 않습니다.

## 작동 방식

1. 사용자가 검색어와 기준 주소를 입력합니다.
2. 기준 주소에서 시군구를 추출합니다.
3. 해당 시군구 데이터 조각만 로딩합니다.
4. 생산품, 원자재, 업종명, 회사명, 주소를 검색합니다.
5. 상위 후보만 Google/Naver API로 좌표 변환합니다.
6. 좌표 변환된 공장만 지도에 표시합니다.
7. Google Maps 사용 시 상위 후보만 도로 거리/시간 계산을 시도합니다.
8. 좌표와 거리 결과는 브라우저 localStorage 캐시에 저장합니다.

## 권장 설정

- 검색당 좌표 변환 최대 건수: 20
- 검색당 도로 시간 계산 최대 건수: 20

챌린지 데모에서는 10~20건으로 충분합니다.

## Google Maps에서 필요한 API

- Maps JavaScript API
- Geocoding API
- Distance Matrix API 또는 Routes API 계열

## 키 보안

API 키를 코드에 직접 넣지 말고, 홈페이지 우측 상단 `지도 API 설정`에서 입력하세요.
Google Cloud Console에서 다음 제한을 권장합니다.

- HTTP referrer 제한
- 허용 API 제한
- 일일 예산/알림 설정
- 데모용 도메인만 허용

## Naver Maps 사용 시

Naver Cloud Platform에서 Maps JavaScript API와 Geocoding 사용 권한을 확인하세요.
브라우저 공개 키 방식은 도메인 제한을 반드시 설정하는 것이 좋습니다.


## v11

이 패키지는 Google Maps API 키가 기본 적용되어 있습니다. 데모 후에는 반드시 Google Cloud Console에서 도메인 제한과 예산 알림을 설정하세요. 공개 저장소에는 업로드하지 않는 것을 권장합니다.
