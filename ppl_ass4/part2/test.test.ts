import { describe, expect, test } from '@jest/globals'
import {
    delayedSum,testDelayedSum,testFetchData,testFetchData2,testFetchData3, Post, postsUrl, postUrl, invalidUrl, fetchData, fetchMultipleUrls,testFetchMultipleUrls2, testFetchMultipleUrls
} from '../src/part2';

describe('Assignment 4 Part 2', () => {
    describe('Q2.1 delayedSum (6 points)', () => {
        test('delayedSum returns the sum', () => 
        {
            
        })
        test('delayedSum waits at least the specified delay', () => 
        {
            const d = testDelayedSum()
        })
    })

    describe('Q2.2 fetchData (12 points)', () => {
        test('successful call to fetchData with array result', async () => 
        {
            testFetchData();
        })

        test('successful call to fetchData with Post result', async () => 
        {
            testFetchData2();
        })

        test('failed call to fechData', async () => 
        {
            testFetchData3();
        })

    })

    describe('Q2.3 fetchMultipleUrls (12 points)', () => {
        test('successful call to fetchMultipleUrls', async () => 
        {

           await testFetchMultipleUrls();

        })

        test('successful call to fetchMultipleUrls: verify results are in the expected order ', async () => {
        })

        test('failed call to fetchMultipleUrls', async () =>
        {
            await testFetchMultipleUrls2();
        })

    })
});

