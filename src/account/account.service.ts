import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bank } from 'src/bank/entities/bank.entity';
import { BankBranch } from 'src/bank/entities/bankbranch.entity';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Bank) private readonly bankRepository: Repository<Bank>,
    @InjectRepository(BankBranch)
    private readonly bankbranchRepository: Repository<BankBranch>,
  ) {}
  async create(createAccountDto: CreateAccountDto) {
    try {
      const { userId, bankId, branchIfsc } = createAccountDto;
      const checkUser = await this.userRepository.findBy({ userId });
      if (!checkUser) throw new NotFoundException('User Not Found');

      const checkbranch = await this.bankbranchRepository.findBy({
        branchIfsc,
      });
      if (!checkbranch) throw new NotFoundException('Bank Branch Not Found');
      const bankcheck = bankId.map(async (eachId) => {
        const checkbank = await this.bankRepository.find({
          where: { bankId: eachId },
        });
        if (!checkbank) throw new NotFoundException('Bank Not Found');
      });

      const bankData = await this.find(userId);

      delete createAccountDto.userId;
      delete createAccountDto.bankId;
      bankData.map((eachBank) => {
        if (bankId.includes(eachBank.bank.bankId)) {
          throw new BadRequestException('This user has already this bank ');
        }
      });

      const data = bankId.map(async (eachId) => {
        const datas = await this.accountRepository.save({
          ...createAccountDto,
          user: { userId },
          branchIfsc,
          bank: { bankId: eachId },
        });
      });

      return data;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.driverError.detail);
    }
  }

  async update(accountId: string, updateAccountDto: UpdateAccountDto) {
    const { bankId, branchIfsc } = updateAccountDto;
    console.log(branchIfsc);
    delete updateAccountDto.branchIfsc;
    try {
      if (!bankId) {
        const datas = await this.accountRepository.update(
          { accountId },
          {
            ...updateAccountDto,
            branch: { branchIfsc },
          },
        );
        return datas;
      } else {
        const data = bankId.map(async (eachId) => {
          const datas = await this.accountRepository.update(
            { accountId },
            {
              ...updateAccountDto,
              branch: { branchIfsc },
            },
          );
        });
        return data;
      }
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.driverError.detail);
    }
  }

  // async find(userId: string) {
  //   return await this.accountRepository.find({
  //     where: { user: { userId } },
  //     relations: { bank: true, branch: true },
  //   });
  // }

  async find(userId: string) {
    // return await this.accountRepository.find({
    //   where: { user: { userId } },
    //   relations: { bank: true, branch: true },
    // });
    return await this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.user', 'user')
      .leftJoinAndSelect('account.bank', 'bank')
      .leftJoinAndSelect('account.branch', 'branch')
      .where('user.userId = :userId', { userId })
      .getMany();
  }

  async remove(userId: string) {
    return await this.accountRepository.delete({ user: { userId } });
  }
}
