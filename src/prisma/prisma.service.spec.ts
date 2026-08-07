import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('conecta no boot (onModuleInit chama $connect)', async () => {
    const service = new PrismaService();
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('desconecta no shutdown (onModuleDestroy chama $disconnect)', async () => {
    const service = new PrismaService();
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
