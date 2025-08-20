//12471040 CHOIYUHYEON
#include <stdio.h>
#include <stdlib.h>
// Additional code (if any) can be added here.
// 유니온-파인드 자료구조를 위한 배열 선언
int parent[100005]; // 부모 노드를 저장하는 배열
int rank[100005];   // 트리의 높이를 저장하는 배열

// 연결 요소의 개수를 저장하는 변수
int component_count;

// Find 함수: 경로 압축을 사용하여 부모를 찾음
int find(int x) {
    if (parent[x] != x) {
        parent[x] = find(parent[x]); // 경로 압축
    }
    return parent[x];
}

// Union 함수: 두 집합을 병합
void union_sets(int x, int y) {
    int rootX = find(x);
    int rootY = find(y);

    if (rootX != rootY) {
        // 트리의 높이를 기준으로 병합
        if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;
        }
        component_count--; // 연결 요소 개수 감소
    }
}

// 초기화 함수: 유니온-파인드 자료구조 초기화
void initialize(int n) {
    component_count = n; // 초기 연결 요소 개수는 정점의 수와 같음
    for (int i = 0; i < n; i++) {
        parent[i] = i; // 각 정점의 부모를 자기 자신으로 설정
        rank[i] = 0;   // 초기 트리 높이는 0
    }
}

int main() {
    int N, Q;
    scanf("%d %d", &N, &Q);

    initialize(N); // 유니온-파인드 초기화

    long long F = 0; // F는 최초 0으로 시작

    for (int i = 0; i < Q; i++) {
        long long a, b;
        scanf("%lld %lld", &a, &b);

        // x와 y 계산
        int x = (a ^ F) % N;
        int y = (b ^ F) % N;

        if (x > y) { 
            // 문제에서 x > y 조건이 명시된 경우에만 교환 필요
            int temp = x;
            x = y;
            y = temp;
        }

        if (i % 2 == 0) { 
            // 첫 번째 쿼리: 간선 추가 또는 제거 처리 (x < y)
            union_sets(x, y);
            F += component_count; // 연결 요소 개수를 더함
        } else { 
            // 두 번째 쿼리: 연결 여부 확인 (y < x)
            if (find(x) == find(y)) {
                printf("1\n");
                F += component_count; // 연결 요소 개수를 더함
            } else {
                printf("0\n");
                F += component_count; // 연결 요소 개수를 더함
            }
        }
    }

    return 0;
}