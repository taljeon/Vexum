//12471040 CHOIYUHYEON 完成版
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define LEN 30
#define TEXTLEN 100
/* 作成済み */
void read_input(char *in);
void print_marks(int n, int *xs, int *ys);
/* 練習課題3*/
int count_digits(char *from);
/*　練習課題4 */
int digits_to_int(char *from, char *to);
/* Step 1: 自分で実装しよう */
int process_insts(char *in, int *xs, int *ys);          
/* Step 2: 自分で実装しよう */
void sort_marks(int n, int *xs, int *ys);
/* 作成済み */


void read_input(char * in) { /* 作成済み */
    scanf("%100s", in);
}

void print_marks(int n, int * xs, int * ys) { /* 作成済み */
    int i;
    for(i=0; i<n; i++) {
        printf("%2d: %d %d\n", i, xs[i], ys[i]);
    }
}

int count_digits(char *from) { /* 練習問題３ */
    int count = 0;
    while (*from >= '0' && *from <= '9') {
        count++;
        from++;
    }
    return count;
}

int digits_to_int(char *from, char *to) { /* 練習問題４ */
    int result = 0;
    while (from < to) {
        result = result * 10 + (*from - '0');
        from++;
    }
    return result;
}

int process_insts(char *in, int *xs, int *ys) {
    /* 自分で実装しよう */
    int x = 0, y = 0;
    int count = 0;
    xs[count] = x;
    ys[count] = y;
    count++;

    while (*in != '\0') {
        char houkou = *in;
        in++;
        int digits = count_digits(in);
        int kyori = digits_to_int(in, in + digits);
        in += digits;

        switch (houkou) {
            case 'N':
                y += kyori;
                break;
            case 'S':
                y -= kyori;
                break;
            case 'E':
                x += kyori;
                break;
            case 'W':
                x -= kyori;
                break;
        }

        xs[count] = x;
        ys[count] = y;
        count++;
    }

    return count;
}

void sort_marks(int n, int *xs, int *ys) {
    /* 自分で実装しよう */
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (xs[i] > xs[j] || (xs[i] == xs[j] && ys[i] > ys[j])) {
                int temp_x = xs[i];
                int temp_y = ys[i];
                xs[i] = xs[j];
                ys[i] = ys[j];
                xs[j] = temp_x;
                ys[j] = temp_y;
            }
        }
    }
}
int main() {
    int n;
    int Xs[LEN], Ys[LEN];
    char input[TEXTLEN+1];
    read_input(input);
    printf("process_inst-----\n");
    n = process_insts(input, Xs, Ys);
    printf("print marks (placed order)-----\n");
    print_marks(n, Xs, Ys);
    printf("start sorting-----\n");
    sort_marks(n, Xs, Ys);
    printf("print marks (sorted)-----\n");
    print_marks(n, Xs, Ys);
    return 0;
}