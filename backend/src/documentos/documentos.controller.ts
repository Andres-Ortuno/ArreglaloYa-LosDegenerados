import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { SubirDocumentoDto, TIPOS_DOCUMENTO } from './dto/subir-documento.dto.js';
import { type ArchivoSubido, DocumentosService, MAX_BYTES } from './documentos.service.js';

@ApiTags('Documentos del trabajador')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trabajadores/me/documentos')
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  /** RF-03. Se envía como formulario con archivo (multipart): campos «tipo» y «archivo». */
  @Post()
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: MAX_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tipo', 'archivo'],
      properties: {
        tipo: { type: 'string', enum: [...TIPOS_DOCUMENTO] },
        archivo: { type: 'string', format: 'binary', description: 'PDF, JPG o PNG de hasta 5 MB' },
      },
    },
  })
  subir(
    @UsuarioActual() usuario: UsuarioToken,
    @Body() dto: SubirDocumentoDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ) {
    return this.documentos.subir(usuario.id, dto.tipo, archivo);
  }

  /** Mis documentos, su estado y cuáles me faltan. */
  @Get()
  mios(@UsuarioActual() usuario: UsuarioToken) {
    return this.documentos.mios(usuario.id);
  }
}
