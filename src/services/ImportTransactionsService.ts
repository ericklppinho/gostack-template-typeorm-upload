import csvParse from 'csv-parse/lib/sync';
import fs from 'fs';
import path from 'path';

import { getCustomRepository, getRepository } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    const csvFilePath = path.join(uploadConfig.directory, filename);

    const file = await fs.promises.readFile(csvFilePath);

    const rows = csvParse(file, {
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    for (const row of rows) {
      const request = {
        title: row[0],
        type: row[1],
        value: Number(row[2]),
        category: row[3],
      };

      if (request.type !== 'income' && request.type !== 'outcome') {
        throw new AppError('Invalid type.');
      }

      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );

      // const balance = await transactionsRepository.getBalance();

      // // if (request.type === 'outcome' && balance.total - request.value < 0) {
      // //   throw new AppError("Don't have this value.");
      // // }

      const categoriesRepository = getRepository(Category);

      let categoryModel = await categoriesRepository.findOne({
        where: { title: request.category },
      });

      if (!categoryModel) {
        categoryModel = categoriesRepository.create({
          title: request.category,
        });

        await categoriesRepository.save(categoryModel);
      }

      const transaction = transactionsRepository.create({
        title: request.title,
        type: request.type,
        value: request.value,
        category_id: categoryModel.id,
      });

      await transactionsRepository.save(transaction);

      transactions.push(transaction);
    }

    try {
      await fs.promises.unlink(csvFilePath);
    } catch (err) {
      console.error(err);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
