// import AppError from '../errors/AppError';
import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('Invalid type.');
    }

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && balance.total - value < 0) {
      throw new AppError("Don't have this value.");
    }

    const categoriesRepository = getRepository(Category);
    let categoryModel = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categoryModel) {
      categoryModel = categoriesRepository.create({
        title: category,
      });
      await categoriesRepository.save(categoryModel);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryModel.id,
    });
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
