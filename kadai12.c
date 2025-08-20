//12471040 CHOIYUHYEON
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define NUM (100)

typedef struct stuScore {
    int id;
    char name[50];
    int eng;   
    int math;  
    int jpn;   
    int total; 
    struct stuScore *next;
} STUS;

STUS *head = NULL;

void insertCell(int s_id, char *s_name, int e, int m, int jp, int pn);
int deleteCell(char *prevName);
void calcSum();
void dispList1();
void dispList2(STUS *s, int n);
void copy(STUS *sb, int n);
void sort(STUS *s, int n);

int main(void)
{
    STUS *stu, *q;
    STUS tmpStu;
    STUS stub[NUM];
    int i, count, prevNum, select = 0;
    FILE *fp;
    char prevName[50];

    fp = fopen("data12_2.txt", "r");
    if(fp == NULL) {
        printf("ファイルが開けません\n");
        return 1;
    }

    stu = (STUS *)malloc(sizeof(STUS));
    stu->id = 1001;
    strcpy(stu->name, "HYOGO_CHIKA");
    stu->eng = 132;
    stu->math = 163;
    stu->jpn = 43;
    stu->next = NULL;
    q = stu;
    head = stu;
    i = 1;
    while (fscanf(fp, "%d %s %d %d %d",
                  &tmpStu.id, tmpStu.name, &tmpStu.eng,
                  &tmpStu.math, &tmpStu.jpn) != EOF){
        stu = (STUS *)malloc(sizeof(STUS));
        stu->id = tmpStu.id;
        strcpy(stu->name, tmpStu.name);
        stu->eng = tmpStu.eng;
        stu->math = tmpStu.math;
        stu->jpn = tmpStu.jpn;
        stu->next = NULL;
        q->next = stu;
        q = stu;
        i++;
    }
    count = i;
    fclose(fp);

    calcSum();
    copy(stub, count);
    sort(stub, count);

    printf("----------並び替え前--------\n");
    dispList1();
    printf("--------並び替え後--------\n");
    dispList2(stub, count);

    while (1) {
        printf("\n1:push, 2:pop, 3:quit --> ");
        scanf("%d", &select);

        if (select == 1) {
            if (count >= NUM) {
                printf("学生数が上限(%d)を超えました。追加できません。\n", NUM);
                continue;
            }
            printf("挿入するセルの1つ前の学生の番号を入力してください: ");
            scanf("%d", &prevNum);
            printf("学生の番号を入力してください。: ");
            scanf("%d", &tmpStu.id);
            printf("学生の名前を入力してください。: ");
            scanf("%s", tmpStu.name);
            printf("英語の得点を入力してください。: ");
            scanf("%d", &tmpStu.eng);
            printf("数学の得点を入力してください。: ");
            scanf("%d", &tmpStu.math);
            printf("国語の得点を入力してください。: ");
            scanf("%d", &tmpStu.jpn);

            insertCell(tmpStu.id, tmpStu.name, tmpStu.eng, tmpStu.math, tmpStu.jpn, prevNum);

            count++;
            calcSum();
            copy(stub, count);
            sort(stub, count);

            printf("----------並び替え前--------\n");
            dispList1();
            printf("--------並び替え後--------\n");
            dispList2(stub, count);
        }
        else if (select == 2) {
            if (count <= 1) {
                printf("削除できる学生がありません\n");
                continue;
            }
            printf("削除するセルの1つ前の学生の名前を入力してください: ");
            scanf("%s", prevName);

            if(deleteCell(prevName)) {
                count--;
                calcSum();
                copy(stub, count);
                sort(stub, count);

                printf("----------並び替え前--------\n");
                dispList1();
                printf("--------並び替え後--------\n");
                dispList2(stub, count);
            }
        }
        else if (select == 3) {
            break;
        }
        else {
            printf("can't\n");
        }
    }

    // メモリ解放（省略可）

    return 0;
}

// 中間
void insertCell(int s_id, char *s_name, int e, int m, int jp, int pn)
{
    STUS *newStudent, *q;
    q = head;
    while(q != NULL) {
        if(q->id == pn) {
            break;
        }
        q = q->next;
    }
    if(q == NULL) {
        printf("入力された学生の番号はリストにありません。\n");
        return;
    }
    newStudent = (STUS *)malloc(sizeof(STUS));
    newStudent->id = s_id;
    strcpy(newStudent->name, s_name);
    newStudent->eng = e;
    newStudent->math = m;
    newStudent->jpn = jp;
    newStudent->total = 0;
    newStudent->next = q->next;
    q->next = newStudent;
}

int deleteCell(char *prevName)
{
    STUS *q = head;
    STUS *delCell;
// 先頭のセルを削除する場合
    if(strcmp(head->name, prevName) == 0) {
        if(head->next == NULL) {
            printf("削除対象がありません\n");
            return 0;
        }
        delCell = head->next;
        head->next = delCell->next;
        free(delCell);
        printf("削除しました\n");
        return 1;
    }

    // prevName探し
    while(q != NULL && q->next != NULL) {
        if(strcmp(q->name, prevName) == 0) {
            break;
        }
        q = q->next;
    }
    if(q == NULL || q->next == NULL) {
        printf("該当する学生が見つからないか、最後のノードのため削除できません。\n");
        return 0;
    }
    delCell = q->next;
    q->next = delCell->next;
    free(delCell);
    printf("削除しました\n");
    return 1;
}

void calcSum( )
{
    STUS *p = head;
    while(p != NULL){
        p->total = p->eng + p->math + p->jpn;
        p = p->next;
    }
}

void dispList1()
{
    STUS *p = head;
    printf("/////////////////////////////////////////////////////\n");
    printf("番号         氏名           英語 数学 国語 合計\n");
    while(p != NULL){
        printf("%6d %-14s %4d %4d %4d %4d\n",
               p->id, p->name, p->eng, p->math, p->jpn, p->total);
        p = p->next;
    }
    printf("\n");
}

void dispList2 (STUS *s, int n)
{
    int i;
    printf("/////////////////////////////////////////////////////\n");
    printf("番号         氏名           英語 数学 国語 合計\n");
    for (i = 0; i < n; i++){
        printf("%6d %-14s %4d %4d %4d %4d\n",
               s->id, s->name, s->eng, s->math, s->jpn, s->total);
        s++;
    }
    printf("\n");
}

void copy (STUS *sb, int n)
{
    int i;
    STUS *p = head;
    for(i = 0; i < n && p != NULL; i++){
        sb[i].id = p->id;
        strcpy(sb[i].name, p->name);
        sb[i].eng = p->eng;
        sb[i].math = p->math;
        sb[i].jpn = p->jpn;
        sb[i].total = p->total;
        p = p->next;
    }
}

void sort(STUS *s, int n)
{
    int i, j;
    STUS temp;
    for(i = 0; i < n - 1; i++){
        for(j = i + 1; j < n; j++){
            if(s[i].total < s[j].total){
                temp = s[i];
                s[i] = s[j];
                s[j] = temp;
            }
        }
    }
}

/*
gcc kadai12.c -o kadai12 && "/Users/yuhyeon/C/WORKSPACE/kada
i/"kadai12
----------並び替え前--------
/////////////////////////////////////////////////////
番号         氏名           英語 数学 国語 合計
  1001 HYOGO_CHIKA     132  163   43  338
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1003 HIGASHI_NADAO   148  198   83  429
  1004 ASHIYA_RIE      133   99   98  330
  1005 OKAMOTO_GORO     75  167   55  297
  1006 HYOGO_MIDORI    149  124   93  366
  1007 KOBE_JIRO        89  191   23  303
  1008 KONAN_TARO      129  187   62  378
  1009 KANAGAWA_SAYO   127  132   94  353

--------並び替え後--------
/////////////////////////////////////////////////////
番号         氏名           英語 数学 国語 合計
  1003 HIGASHI_NADAO   148  198   83  429
  1008 KONAN_TARO      129  187   62  378
  1006 HYOGO_MIDORI    149  124   93  366
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1009 KANAGAWA_SAYO   127  132   94  353
  1001 HYOGO_CHIKA     132  163   43  338
  1004 ASHIYA_RIE      133   99   98  330
  1007 KOBE_JIRO        89  191   23  303
  1005 OKAMOTO_GORO     75  167   55  297


1:push, 2:pop, 3:quit --> 1
挿入するセルの1つ前の学生の番号を入力してください: 1009
学生の番号を入力してください。: 1010
学生の名前を入力してください。: YAMADA
英語の得点を入力してください。: 100
数学の得点を入力してください。: 155
国語の得点を入力してください。: 180
----------並び替え前--------
/////////////////////////////////////////////////////
番号         氏名           英語 数学 国語 合計
  1001 HYOGO_CHIKA     132  163   43  338
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1003 HIGASHI_NADAO   148  198   83  429
  1004 ASHIYA_RIE      133   99   98  330
  1005 OKAMOTO_GORO     75  167   55  297
  1006 HYOGO_MIDORI    149  124   93  366
  1007 KOBE_JIRO        89  191   23  303
  1008 KONAN_TARO      129  187   62  378
  1009 KANAGAWA_SAYO   127  132   94  353
  1010 YAMADA          100  155  180  435

--------並び替え後--------
/////////////////////////////////////////////////////
番号         氏名           英語 数학 国語 合計
  1010 YAMADA          100  155  180  435
  1003 HIGASHI_NADAO   148  198   83  429
  1008 KONAN_TARO      129  187   62  378
  1006 HYOGO_MIDORI    149  124   93  366
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1009 KANAGAWA_SAYO   127  132   94  353
  1001 HYOGO_CHIKA     132  163   43  338
  1004 ASHIYA_RIE      133   99   98  330
  1007 KOBE_JIRO        89  191   23  303
  1005 OKAMOTO_GORO     75  167   55  297


1:push, 2:pop, 3:quit --> 2
削除するセルの1つ前の学生の名前を入力してください: ASHIYA_RIE
削除しました
----------並び替え前--------
/////////////////////////////////////////////////////
番号         氏名           英語 数学 国語 合計
  1001 HYOGO_CHIKA     132  163   43  338
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1003 HIGASHI_NADAO   148  198   83  429
  1004 ASHIYA_RIE      133   99   98  330
  1006 HYOGO_MIDORI    149  124   93  366
  1007 KOBE_JIRO        89  191   23  303
  1008 KONAN_TARO      129  187   62  378
  1009 KANAGAWA_SAYO   127  132   94  353
  1010 YAMADA          100  155  180  435

--------並び替え後--------
/////////////////////////////////////////////////////
番号         氏名           英語 数学 国語 合計
  1010 YAMADA          100  155  180  435
  1003 HIGASHI_NADAO   148  198   83  429
  1008 KONAN_TARO      129  187   62  378
  1006 HYOGO_MIDORI    149  124   93  366
  1002 MOTOYAMA_TAEKO   74  185   99  358
  1009 KANAGAWA_SAYO   127  132   94  353
  1001 HYOGO_CHIKA     132  163   43  338
  1004 ASHIYA_RIE      133   99   98  330
  1007 KOBE_JIRO        89  191   23  303


1:push, 2:pop, 3:quit --> 
3
*/